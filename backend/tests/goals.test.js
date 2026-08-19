import { describe, it, expect, beforeEach } from "vitest";
import { app, request, createUser, firstCategoryId, createCreditCard } from "./helpers.js";

/**
 * Vínculo entre reserva e meta.
 *
 * Guardar um valor pode apontar para uma meta, do mesmo jeito que uma compra no
 * crédito aponta para um cartão. A diferença é que o vínculo é OPCIONAL:
 * guardar sem objetivo continua sendo guardar.
 *
 * A regra que estes testes protegem: o dinheiro é o mesmo com ou sem meta. O
 * total guardado do dashboard sai de savings menos withdrawal e não muda por
 * causa do vínculo — a meta só registra quanto da reserva está reservado
 * para aquele objetivo.
 */

let user;

beforeEach(async () => {
	user = await createUser();
});

const lancar = (body) => user.auth(request(app).post("/transactions")).send(body);
const buscar = (path) => user.auth(request(app).get(path)).expect(200);

async function criarMeta(overrides = {}) {
	const response = await user
		.auth(request(app).post("/goals"))
		.send({ name: "Viagem", targetAmountInCents: 500_000, ...overrides })
		.expect(201);

	return response.body;
}

const guardar = (valor, goal, data = "2026-03-05") =>
	lancar({ type: "savings", description: "Guardado", totalValueInCents: valor, date: data, goal });

const resgatar = (valor, goal, data = "2026-04-05") =>
	lancar({ type: "withdrawal", description: "Resgate", totalValueInCents: valor, date: data, goal });

const lerMeta = async (id) => {
	const response = await buscar("/goals");
	return response.body.find((goal) => goal._id === id);
};

describe("progresso da meta", () => {
	it("guardar com meta soma no progresso dela", async () => {
		const meta = await criarMeta();

		await guardar(30_000, meta._id).expect(201);
		await guardar(20_000, meta._id).expect(201);

		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(50_000);
	});

	it("guardar sem meta não mexe em meta nenhuma, mas conta na reserva", async () => {
		const meta = await criarMeta();

		await guardar(40_000, null).expect(201);

		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(0);

		const total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(40_000);
	});

	it("o total guardado é o mesmo com ou sem meta", async () => {
		const meta = await criarMeta();

		await guardar(30_000, meta._id).expect(201);
		await guardar(70_000, null).expect(201);

		const total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(100_000);
	});

	it("resgatar da meta desconta do progresso", async () => {
		const meta = await criarMeta();

		await guardar(80_000, meta._id).expect(201);
		await resgatar(30_000, meta._id).expect(201);

		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(50_000);
	});

	it("resgatar mais do que a meta acumulou para em zero, nunca em negativo", async () => {
		const meta = await criarMeta();

		await guardar(20_000, meta._id).expect(201);
		// A reserva tem mais do que a meta: o resgate é válido, mas a meta só
		// pode devolver o que registrou.
		await guardar(50_000, null).expect(201);
		await resgatar(60_000, meta._id).expect(201);

		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(0);
	});
});

describe("edição de um lançamento com meta", () => {
	it("mudar o valor reflete no progresso", async () => {
		const meta = await criarMeta();
		const criado = await guardar(30_000, meta._id).expect(201);

		await user
			.auth(request(app).patch(`/transactions/${criado.body._id}`))
			.send({ totalValueInCents: 45_000 })
			.expect(200);

		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(45_000);
	});

	it("trocar de meta move o valor de uma para a outra", async () => {
		const origem = await criarMeta({ name: "Viagem" });
		const destino = await criarMeta({ name: "Carro" });
		const criado = await guardar(30_000, origem._id).expect(201);

		await user
			.auth(request(app).patch(`/transactions/${criado.body._id}`))
			.send({ goal: destino._id })
			.expect(200);

		expect((await lerMeta(origem._id)).currentAmountInCents).toBe(0);
		expect((await lerMeta(destino._id)).currentAmountInCents).toBe(30_000);
	});

	it("virar despesa desfaz o vínculo e devolve o progresso", async () => {
		const meta = await criarMeta();
		const criado = await guardar(30_000, meta._id).expect(201);
		const categoria = await firstCategoryId(user.token);

		const atualizado = await user
			.auth(request(app).patch(`/transactions/${criado.body._id}`))
			.send({ type: "debit", category: categoria })
			.expect(200);

		expect(atualizado.body.goal).toBeNull();
		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(0);
	});
});

describe("exclusões", () => {
	it("excluir o lançamento devolve o valor ao progresso da meta", async () => {
		const meta = await criarMeta();
		const criado = await guardar(30_000, meta._id).expect(201);

		await user.auth(request(app).delete(`/transactions/${criado.body._id}`)).expect(200);

		expect((await lerMeta(meta._id)).currentAmountInCents).toBe(0);
	});

	it("excluir a meta desvincula os lançamentos sem apagar o histórico", async () => {
		const meta = await criarMeta();
		await guardar(30_000, meta._id).expect(201);

		await user.auth(request(app).delete(`/goals/${meta._id}`)).expect(200);

		const transacoes = await buscar("/transactions");
		expect(transacoes.body).toHaveLength(1);
		expect(transacoes.body[0].goal).toBeNull();

		// O dinheiro continua guardado: ele nunca esteve "dentro" da meta.
		const total = await buscar("/dashboard/saved-money-total");
		expect(total.body.savedInCents).toBe(30_000);
	});
});

describe("regras de vínculo", () => {
	it("despesa não pode apontar para uma meta", async () => {
		const meta = await criarMeta();
		const categoria = await firstCategoryId(user.token);

		await lancar({
			type: "debit",
			description: "Mercado",
			totalValueInCents: 10_000,
			date: "2026-03-05",
			category: categoria,
			goal: meta._id,
		}).expect(400);
	});

	it("compra no crédito não pode apontar para uma meta", async () => {
		const meta = await criarMeta();
		const categoria = await firstCategoryId(user.token);
		const cartao = await createCreditCard(user.token);

		await lancar({
			type: "credit",
			description: "Compra",
			totalValueInCents: 10_000,
			date: "2026-03-05",
			category: categoria,
			bankCard: cartao._id,
			goal: meta._id,
		}).expect(400);
	});

	it("meta de outro usuário é recusada", async () => {
		const outro = await createUser();
		const metaAlheia = await outro
			.auth(request(app).post("/goals"))
			.send({ name: "Meta do vizinho", targetAmountInCents: 100_000 })
			.expect(201);

		await guardar(10_000, metaAlheia.body._id).expect(400);
	});

	it("a listagem devolve a meta populada, com nome e cor", async () => {
		const meta = await criarMeta({ color: "#ff0000" });
		await guardar(30_000, meta._id).expect(201);

		const transacoes = await buscar("/transactions");
		expect(transacoes.body[0].goal).toMatchObject({ name: "Viagem", color: "#ff0000" });
	});
});
