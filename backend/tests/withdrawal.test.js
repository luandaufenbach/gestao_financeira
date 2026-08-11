import { describe, it, expect, beforeEach } from "vitest";
import { app, request, createUser } from "./helpers.js";

/**
 * Resgate (`withdrawal`) — o par simétrico de `savings`.
 *
 * Antes de existir, o valor guardado só crescia: não havia como registrar uma
 * retirada da reserva, e o total acumulado virava ficção com o tempo.
 */

let user;

beforeEach(async () => {
	user = await createUser();
});

const lancar = (body) => user.auth(request(app).post("/transactions")).send(body);
const buscar = (path) => user.auth(request(app).get(path)).expect(200);

const guardar = (valor, data) =>
	lancar({ type: "savings", description: "Guardado", totalValueInCents: valor, date: data });

const resgatar = (valor, data) =>
	lancar({ type: "withdrawal", description: "Resgate", totalValueInCents: valor, date: data });

describe("efeito no valor guardado total", () => {
	it("o total sobe ao guardar e DESCE ao resgatar", async () => {
		await guardar(50_000, "2026-03-05").expect(201);
		await guardar(50_000, "2026-04-05").expect(201);

		let total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(100_000);

		await resgatar(30_000, "2026-05-10").expect(201);

		// O comportamento antigo manteria 100.000 aqui, para sempre.
		total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(70_000);
	});

	it("resgatar tudo zera a reserva", async () => {
		await guardar(20_000, "2026-03-05").expect(201);
		await resgatar(20_000, "2026-03-10").expect(201);

		const total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(0);
	});

	it("o valor guardado do mês é líquido", async () => {
		await guardar(50_000, "2026-03-05").expect(201);
		await resgatar(20_000, "2026-03-20").expect(201);

		const mes = await buscar("/dashboard/saved-money?year=2026&month=3");
		expect(mes.body.savedInCents).toBe(30_000);
	});
});

describe("efeito no saldo do mês", () => {
	it("o resgate soma no disponível", async () => {
		// Mês 3: recebe 500, guarda 200 -> disponível 300.
		await lancar({
			type: "income",
			description: "Salário",
			totalValueInCents: 50_000,
			date: "2026-03-05",
		}).expect(201);
		await guardar(20_000, "2026-03-06").expect(201);

		const marco = await buscar("/dashboard/monthly-balance?year=2026&month=3");
		expect(marco.body.balanceInCents).toBe(30_000);

		// Mês 4: sem receita, resgata 200 -> disponível 200.
		await resgatar(20_000, "2026-04-10").expect(201);

		const abril = await buscar("/dashboard/monthly-balance?year=2026&month=4");
		expect(abril.body.balanceInCents).toBe(20_000);
		expect(abril.body.withdrawnInCents).toBe(20_000);

		// O resgate não é receita: o resultado do mês continua zero.
		expect(abril.body.netResultInCents).toBe(0);

		// A reserva variou -200 em abril.
		expect(abril.body.netSavedInCents).toBe(-20_000);
	});

	it("resgatar e gastar deixa a diferença disponível", async () => {
		await lancar({
			type: "income",
			description: "Salário",
			totalValueInCents: 100_000,
			date: "2026-03-01",
		}).expect(201);
		await guardar(100_000, "2026-03-02").expect(201);

		// Abril: resgata 1000 e gasta 600.
		await resgatar(100_000, "2026-04-01").expect(201);

		const categorias = await buscar("/categories");
		await lancar({
			type: "debit",
			description: "Conserto",
			totalValueInCents: 60_000,
			date: "2026-04-02",
			category: categorias.body[0]._id,
		}).expect(201);

		const abril = await buscar("/dashboard/monthly-balance?year=2026&month=4");
		expect(abril.body.balanceInCents).toBe(40_000);

		const total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(0);
	});
});

describe("proteção contra resgate a descoberto", () => {
	it("recusa resgatar mais do que existe guardado", async () => {
		await guardar(10_000, "2026-03-05").expect(201);

		const { body } = await resgatar(15_000, "2026-03-10").expect(400);

		// A mensagem informa quanto está disponível, para o usuário se corrigir.
		expect(body.message).toMatch(/100,00/);
	});

	it("recusa resgatar sem nada guardado", async () => {
		await resgatar(1000, "2026-03-10").expect(400);
	});

	it("permite resgatar exatamente o disponível", async () => {
		await guardar(10_000, "2026-03-05").expect(201);
		await resgatar(10_000, "2026-03-10").expect(201);
	});

	it("considera resgates anteriores no cálculo", async () => {
		await guardar(10_000, "2026-03-05").expect(201);
		await resgatar(6_000, "2026-03-10").expect(201);

		// Restam 4.000; pedir 5.000 deve falhar.
		await resgatar(5_000, "2026-03-15").expect(400);
		await resgatar(4_000, "2026-03-15").expect(201);
	});

	it("ao editar, não conta o valor antigo da própria transação", async () => {
		await guardar(10_000, "2026-03-05").expect(201);
		const resgate = await resgatar(3_000, "2026-03-10").expect(201);

		// Reserva = 7.000 com este resgate aplicado. Aumentar para 10.000 é
		// válido, porque o valor antigo (3.000) sai da conta ao recalcular.
		await user
			.auth(request(app).patch(`/transactions/${resgate.body._id}`))
			.send({ totalValueInCents: 10_000 })
			.expect(200);

		const total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(0);

		// Já 10.001 estoura.
		await user
			.auth(request(app).patch(`/transactions/${resgate.body._id}`))
			.send({ totalValueInCents: 10_001 })
			.expect(400);
	});

	it("a reserva é por usuário", async () => {
		const outro = await createUser({ email: "outro-resgate@exemplo.com" });

		await guardar(50_000, "2026-03-05").expect(201);

		// O outro usuário não pode resgatar contra a reserva alheia.
		await outro
			.auth(request(app).post("/transactions"))
			.send({
				type: "withdrawal",
				description: "Resgate alheio",
				totalValueInCents: 10_000,
				date: "2026-03-10",
			})
			.expect(400);
	});
});

describe("regras gerais do resgate", () => {
	it("não exige categoria", async () => {
		await guardar(10_000, "2026-03-05").expect(201);
		await resgatar(5_000, "2026-03-10").expect(201);
	});

	it("não pode ser parcelado", async () => {
		await guardar(10_000, "2026-03-05").expect(201);

		await lancar({
			type: "withdrawal",
			description: "Resgate parcelado?",
			totalValueInCents: 5_000,
			date: "2026-03-10",
			installments: 3,
		}).expect(400);
	});

	it("excluir o resgate devolve o valor à reserva", async () => {
		await guardar(10_000, "2026-03-05").expect(201);
		const resgate = await resgatar(4_000, "2026-03-10").expect(201);

		let total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(6_000);

		await user.auth(request(app).delete(`/transactions/${resgate.body._id}`)).expect(200);

		total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(10_000);
	});
});
