import { describe, it, expect, beforeEach } from "vitest";
import { app, request, createUser, firstCategoryId } from "./helpers.js";

/**
 * Faturas de cartão de crédito.
 *
 * O cenário de referência é o do usuário: cartão que fecha dia 01 e vence dia
 * 05. Compras feitas em julho entram na "fatura de agosto", paga em 05/08.
 */

let user;
let categoryId;
let cardId;

beforeEach(async () => {
	user = await createUser();
	categoryId = await firstCategoryId(user.token);

	const card = await user
		.auth(request(app).post("/bank-cards"))
		.send({
			name: "Nubank",
			bank: "Nubank",
			lastFourDigits: "1234",
			type: "credit",
			closingDay: 1,
			dueDay: 5,
		})
		.expect(201);

	cardId = card.body._id;
});

const comprar = (valor, data, descricao = "Compra") =>
	user
		.auth(request(app).post("/transactions"))
		.send({
			type: "credit",
			description: descricao,
			totalValueInCents: valor,
			date: data,
			category: categoryId,
			bankCard: cardId,
		})
		.expect(201);

const pagar = (valor, data, ciclo) =>
	user.auth(request(app).post("/transactions")).send({
		type: "invoice_payment",
		description: "Pagamento da fatura",
		totalValueInCents: valor,
		date: data,
		bankCard: cardId,
		invoiceCycle: ciclo,
	});

const faturas = () => user.auth(request(app).get(`/bank-cards/${cardId}/invoices?limit=12`));

const fatura = (ciclo) => user.auth(request(app).get(`/bank-cards/${cardId}/invoices/${ciclo}`));

describe("montagem da fatura", () => {
	it("agrupa as compras de julho na fatura de agosto", async () => {
		await comprar(20_000, "2026-07-10", "Gasolina");
		await comprar(30_000, "2026-07-20", "Mercado");

		const { body } = await fatura("2026-08").expect(200);

		expect(body.totalInCents).toBe(50_000);
		expect(body.transactionCount).toBe(2);
		expect(body.closingDate.slice(0, 10)).toBe("2026-08-01");
		expect(body.dueDate.slice(0, 10)).toBe("2026-08-05");
		expect(body.label).toBe("agosto de 2026");
	});

	it("compra após o fechamento cai na fatura seguinte", async () => {
		// Fechou em 01/08; a compra do dia 02 já é da próxima.
		await comprar(10_000, "2026-08-01", "Antes do corte");
		await comprar(70_000, "2026-08-02", "Depois do corte");

		const agosto = await fatura("2026-08").expect(200);
		const setembro = await fatura("2026-09").expect(200);

		expect(agosto.body.totalInCents).toBe(10_000);
		expect(setembro.body.totalInCents).toBe(70_000);
	});

	it("ignora compras de outro cartão", async () => {
		const outroCartao = await user
			.auth(request(app).post("/bank-cards"))
			.send({
				name: "Outro",
				lastFourDigits: "9999",
				type: "credit",
				closingDay: 1,
				dueDay: 5,
			})
			.expect(201);

		await comprar(20_000, "2026-07-10");

		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "credit",
				description: "Compra no outro cartão",
				totalValueInCents: 99_000,
				date: "2026-07-10",
				category: categoryId,
				bankCard: outroCartao.body._id,
			})
			.expect(201);

		const { body } = await fatura("2026-08").expect(200);
		expect(body.totalInCents).toBe(20_000);
	});

	it("ignora débito e receita, mesmo vinculados ao cartão", async () => {
		await comprar(20_000, "2026-07-10");

		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "debit",
				description: "Compra no débito",
				totalValueInCents: 50_000,
				date: "2026-07-11",
				category: categoryId,
				bankCard: cardId,
			})
			.expect(201);

		const { body } = await fatura("2026-08").expect(200);
		expect(body.totalInCents).toBe(20_000);
	});

	it("distribui as parcelas entre faturas consecutivas", async () => {
		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "credit",
				description: "Notebook",
				totalValueInCents: 30_000,
				date: "2026-07-10",
				category: categoryId,
				bankCard: cardId,
				installments: 3,
			})
			.expect(201);

		const agosto = await fatura("2026-08").expect(200);
		const setembro = await fatura("2026-09").expect(200);
		const outubro = await fatura("2026-10").expect(200);

		expect(agosto.body.totalInCents).toBe(10_000);
		expect(setembro.body.totalInCents).toBe(10_000);
		expect(outubro.body.totalInCents).toBe(10_000);
	});
});

describe("status da fatura", () => {
	/**
	 * "Aberta" e "parcial" dependem do vencimento ainda não ter chegado, então
	 * estes testes não podem usar datas fixas — elas envelhecem e o teste passa
	 * a falhar sozinho com o tempo.
	 *
	 * A solução é ancorar na fatura que está aberta AGORA: a listagem devolve os
	 * ciclos do mais recente para o mais antigo, e o primeiro é sempre o que
	 * ainda está recebendo compras.
	 */
	async function faturaAberta() {
		const { body } = await faturas().expect(200);
		return body.invoices[0];
	}

	/** Uma data dentro do período da fatura aberta. */
	const hoje = () => new Date().toISOString().slice(0, 10);

	it("sem pagamento fica aberta", async () => {
		const aberta = await faturaAberta();

		await comprar(50_000, hoje());

		const { body } = await fatura(aberta.cycle).expect(200);

		expect(body.status).toBe("aberta");
		expect(body.paidInCents).toBe(0);
		expect(body.remainingInCents).toBe(50_000);
	});

	it("pagamento antecipado parcial deixa a fatura parcial", async () => {
		/**
		 * O caso real do usuário: saiu com os amigos, passou R$ 100 no crédito,
		 * eles devolveram a parte deles e ele já quitou esses R$ 100 para não
		 * misturar com o resto da fatura.
		 */
		const aberta = await faturaAberta();

		await comprar(10_000, hoje(), "Rolê com os amigos");
		await comprar(40_000, hoje(), "Mercado");

		await pagar(10_000, hoje(), aberta.cycle).expect(201);

		const { body } = await fatura(aberta.cycle).expect(200);

		expect(body.status).toBe("parcial");
		expect(body.totalInCents).toBe(50_000);
		expect(body.paidInCents).toBe(10_000);
		expect(body.remainingInCents).toBe(40_000);
	});

	it("vários pagamentos somam e fecham a fatura", async () => {
		await comprar(50_000, "2026-07-10");

		await pagar(10_000, "2026-07-11", "2026-08").expect(201);
		await pagar(40_000, "2026-08-05", "2026-08").expect(201);

		const { body } = await fatura("2026-08").expect(200);

		expect(body.status).toBe("paga");
		expect(body.paidInCents).toBe(50_000);
		expect(body.remainingInCents).toBe(0);
		expect(body.payments).toHaveLength(2);
	});

	it("fatura sem compras nem pagamento é 'vazia'", async () => {
		const { body } = await fatura("2026-08").expect(200);

		expect(body.status).toBe("vazia");
		expect(body.totalInCents).toBe(0);
	});

	it("fatura antiga não paga aparece como vencida", async () => {
		// 2020 está no passado em qualquer execução dos testes.
		await comprar(50_000, "2020-01-10");

		const { body } = await fatura("2020-02").expect(200);

		expect(body.status).toBe("vencida");
	});
});

describe("detalhe da fatura", () => {
	it("agrupa as compras por categoria", async () => {
		const categorias = await user.auth(request(app).get("/categories")).expect(200);
		const [mercado, combustivel] = categorias.body;

		const comprarEm = (valor, data, cat, desc) =>
			user
				.auth(request(app).post("/transactions"))
				.send({
					type: "credit",
					description: desc,
					totalValueInCents: valor,
					date: data,
					category: cat,
					bankCard: cardId,
				})
				.expect(201);

		await comprarEm(20_000, "2026-07-05", mercado._id, "Feira");
		await comprarEm(30_000, "2026-07-12", mercado._id, "Supermercado");
		await comprarEm(15_000, "2026-07-18", combustivel._id, "Posto");

		const { body } = await fatura("2026-08").expect(200);

		expect(body.totalInCents).toBe(65_000);
		expect(body.categories).toHaveLength(2);

		// Ordenado do maior gasto para o menor.
		expect(body.categories[0]).toMatchObject({
			category: mercado.name,
			totalInCents: 50_000,
			count: 2,
		});
		expect(body.categories[1].totalInCents).toBe(15_000);

		// E a lista completa das compras vem junto.
		expect(body.transactions).toHaveLength(3);
	});
});

describe("listagem de faturas", () => {
	it("lista os ciclos do mais recente para o mais antigo", async () => {
		const { body } = await faturas().expect(200);

		expect(body.card.name).toBe("Nubank");
		expect(body.invoices.length).toBe(12);

		const cycles = body.invoices.map((i) => i.cycle);
		expect([...cycles].sort().reverse()).toEqual(cycles);
	});

	it("traz totais e status corretos por ciclo", async () => {
		await comprar(50_000, "2026-07-10");
		await pagar(50_000, "2026-08-05", "2026-08").expect(201);

		const { body } = await faturas().expect(200);
		const agosto = body.invoices.find((i) => i.cycle === "2026-08");

		expect(agosto.totalInCents).toBe(50_000);
		expect(agosto.paidInCents).toBe(50_000);
		expect(agosto.status).toBe("paga");
	});
});

describe("validações", () => {
	it("cartão sem ciclo configurado não tem fatura", async () => {
		const semCiclo = await user
			.auth(request(app).post("/bank-cards"))
			.send({ name: "Sem ciclo", lastFourDigits: "0000", type: "credit" })
			.expect(201);

		await user.auth(request(app).get(`/bank-cards/${semCiclo.body._id}/invoices`)).expect(400);
	});

	it("recusa fechamento sem vencimento", async () => {
		await user
			.auth(request(app).post("/bank-cards"))
			.send({ name: "Meio", lastFourDigits: "1111", type: "credit", closingDay: 1 })
			.expect(400);
	});

	it("pagamento exige cartão e ciclo", async () => {
		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "invoice_payment",
				description: "Sem cartão",
				totalValueInCents: 10_000,
				date: "2026-08-05",
			})
			.expect(400);

		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "invoice_payment",
				description: "Sem ciclo",
				totalValueInCents: 10_000,
				date: "2026-08-05",
				bankCard: cardId,
			})
			.expect(400);
	});

	it("só pagamento de fatura pode informar ciclo", async () => {
		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "debit",
				description: "Débito com ciclo?",
				totalValueInCents: 10_000,
				date: "2026-08-05",
				category: categoryId,
				invoiceCycle: "2026-08",
			})
			.expect(400);
	});

	it("não aceita pagar fatura de cartão de débito", async () => {
		const debito = await user
			.auth(request(app).post("/bank-cards"))
			.send({ name: "Débito", lastFourDigits: "2222", type: "debit" })
			.expect(201);

		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "invoice_payment",
				description: "Fatura de débito?",
				totalValueInCents: 10_000,
				date: "2026-08-05",
				bankCard: debito.body._id,
				invoiceCycle: "2026-08",
			})
			.expect(400);
	});

	it("recusa ciclo malformado na URL", async () => {
		await user.auth(request(app).get(`/bank-cards/${cardId}/invoices/agosto`)).expect(400);
		await user.auth(request(app).get(`/bank-cards/${cardId}/invoices/2026-13`)).expect(400);
	});

	it("não expõe fatura de cartão de outro usuário", async () => {
		const outro = await createUser({ email: "outro-fatura@exemplo.com" });

		await outro.auth(request(app).get(`/bank-cards/${cardId}/invoices`)).expect(404);
	});
});
