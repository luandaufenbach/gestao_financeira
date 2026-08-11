import { describe, it, expect, beforeEach } from "vitest";
import { app, request, createUser, firstCategoryId } from "./helpers.js";

let user;
let categoryId;

beforeEach(async () => {
	user = await createUser();
	categoryId = await firstCategoryId(user.token);
});

const post = (body) => user.auth(request(app).post("/transactions")).send(body);

describe("parcelamento (regressão dos bugs C1, C4 e C7)", () => {
	it("divide o total em centavos exatos, sem sobra nem dízima", async () => {
		// R$100 em 3x: o código antigo gravava 33.333333333333336 em cada parcela.
		const response = await post({
			type: "credit",
			description: "Notebook",
			totalValueInCents: 10_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		}).expect(201);

		const valores = response.body.transactions.map((t) => t.valueInCents);

		expect(valores).toEqual([3334, 3333, 3333]);
		expect(valores.reduce((a, b) => a + b, 0)).toBe(10_000);
	});

	it("distribui as parcelas em meses consecutivos", async () => {
		const response = await post({
			type: "credit",
			description: "Celular",
			totalValueInCents: 30_000,
			date: "2026-11-15",
			category: categoryId,
			installments: 3,
		}).expect(201);

		const datas = response.body.transactions.map((t) => t.date.slice(0, 10));

		expect(datas).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
	});

	it("editar uma parcela NÃO divide o valor de novo (bug C1)", async () => {
		const criada = await post({
			type: "credit",
			description: "Geladeira",
			totalValueInCents: 90_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		}).expect(201);

		const primeiraParcela = criada.body.transactions[0];
		expect(primeiraParcela.valueInCents).toBe(30_000);

		// Salva a transação alterando SÓ a descrição, três vezes seguidas.
		// No código antigo, cada salvamento dividia o valor por 3 outra vez:
		// 30000 -> 10000 -> 3333 -> 1111.
		for (const descricao of ["Geladeira A", "Geladeira B", "Geladeira C"]) {
			await user
				.auth(request(app).patch(`/transactions/${primeiraParcela._id}`))
				.send({ description: descricao })
				.expect(200);
		}

		const lista = await user.auth(request(app).get("/transactions")).expect(200);
		const soma = lista.body.reduce((total, t) => total + t.valueInCents, 0);

		expect(soma).toBe(90_000);
		expect(lista.body.every((t) => t.valueInCents === 30_000)).toBe(true);
	});

	it("guarda o valor total da compra em cada parcela", async () => {
		/**
		 * O total precisa ser um dado explícito, não inferido da parcela:
		 * 3334 × 3 = 10002, e não os 10000 originais. O formulário de edição lê
		 * este campo — sem ele, abrir e salvar uma compra somaria centavos a
		 * cada vez.
		 */
		const criada = await post({
			type: "credit",
			description: "Notebook",
			totalValueInCents: 10_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		}).expect(201);

		for (const parcela of criada.body.transactions) {
			expect(parcela.installment.totalValueInCents).toBe(10_000);
		}

		// Uma parcela isolada, do jeito que o front a recebe na listagem.
		const lista = await user.auth(request(app).get("/transactions")).expect(200);
		expect(lista.body[0].installment.totalValueInCents).toBe(10_000);
		expect(lista.body[0].valueInCents).not.toBe(10_000);
	});

	it("mantém o total sincronizado ao alterá-lo", async () => {
		const criada = await post({
			type: "credit",
			description: "Mesa",
			totalValueInCents: 10_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		}).expect(201);

		await user
			.auth(request(app).patch(`/transactions/${criada.body.transactions[0]._id}`))
			.send({ totalValueInCents: 60_000 })
			.expect(200);

		const lista = await user.auth(request(app).get("/transactions")).expect(200);

		expect(lista.body.every((t) => t.installment.totalValueInCents === 60_000)).toBe(true);
		expect(lista.body.reduce((a, t) => a + t.valueInCents, 0)).toBe(60_000);
	});

	it("alterar o total redistribui todas as parcelas mantendo a soma", async () => {
		const criada = await post({
			type: "credit",
			description: "TV",
			totalValueInCents: 90_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		}).expect(201);

		await user
			.auth(request(app).patch(`/transactions/${criada.body.transactions[0]._id}`))
			.send({ totalValueInCents: 10_000 })
			.expect(200);

		const lista = await user.auth(request(app).get("/transactions")).expect(200);

		expect(lista.body.reduce((t, x) => t + x.valueInCents, 0)).toBe(10_000);
	});

	it("recusa parcelamento acima do teto (bug C4 — DoS)", async () => {
		// Este payload, no código antigo, disparava um milhão de inserts.
		await post({
			type: "credit",
			description: "Ataque",
			totalValueInCents: 1000,
			date: "2026-03-10",
			category: categoryId,
			installments: 1_000_000,
		}).expect(400);
	});

	it("só permite parcelar transações de crédito", async () => {
		await post({
			type: "debit",
			description: "Débito parcelado?",
			totalValueInCents: 1000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		}).expect(400);
	});
});

describe("exclusão de parcelada (regressão do bug C3)", () => {
	async function criarParcelada() {
		const response = await post({
			type: "credit",
			description: "Sofá",
			totalValueInCents: 60_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 6,
		}).expect(201);

		return response.body.transactions;
	}

	it("por padrão apaga somente a parcela pedida", async () => {
		const parcelas = await criarParcelada();

		await user.auth(request(app).delete(`/transactions/${parcelas[0]._id}`)).expect(200);

		const lista = await user.auth(request(app).get("/transactions")).expect(200);

		// O comportamento antigo apagava as 6 sem avisar.
		expect(lista.body).toHaveLength(5);
	});

	it("apaga o grupo inteiro apenas quando pedido explicitamente", async () => {
		const parcelas = await criarParcelada();

		const response = await user
			.auth(request(app).delete(`/transactions/${parcelas[0]._id}?scope=group`))
			.expect(200);

		expect(response.body.deletedCount).toBe(6);

		const lista = await user.auth(request(app).get("/transactions")).expect(200);
		expect(lista.body).toHaveLength(0);
	});
});

describe("intervalo de mês em UTC (regressão do bug C2)", () => {
	it("transação do dia 1º aparece no próprio mês, não no anterior", async () => {
		await post({
			type: "income",
			description: "Salário",
			totalValueInCents: 500_000,
			date: "2026-03-01",
		}).expect(201);

		const marco = await user
			.auth(request(app).get("/transactions?year=2026&month=3"))
			.expect(200);
		expect(marco.body).toHaveLength(1);

		const fevereiro = await user
			.auth(request(app).get("/transactions?year=2026&month=2"))
			.expect(200);
		expect(fevereiro.body).toHaveLength(0);
	});

	it("preserva o dia exato escolhido pelo usuário", async () => {
		const response = await post({
			type: "income",
			description: "Freela",
			totalValueInCents: 100_000,
			date: "2026-03-15",
		}).expect(201);

		expect(response.body.date).toBe("2026-03-15T00:00:00.000Z");
	});

	it("inclui o último dia do mês", async () => {
		await post({
			type: "income",
			description: "Último dia",
			totalValueInCents: 1000,
			date: "2026-03-31",
		}).expect(201);

		const marco = await user
			.auth(request(app).get("/transactions?year=2026&month=3"))
			.expect(200);

		expect(marco.body).toHaveLength(1);
	});
});

describe("validação de entrada", () => {
	it("exige categoria em débito e crédito", async () => {
		await post({
			type: "debit",
			description: "Sem categoria",
			totalValueInCents: 1000,
			date: "2026-03-10",
		}).expect(400);
	});

	it("não exige categoria em receita", async () => {
		await post({
			type: "income",
			description: "Salário",
			totalValueInCents: 1000,
			date: "2026-03-10",
		}).expect(201);
	});

	it("aceita valor zero", async () => {
		// O front antigo bloqueava 0 por causa de um teste de falsy,
		// enquanto o backend aceitava. Aqui fica explícito que 0 é válido.
		await post({
			type: "income",
			description: "Estorno",
			totalValueInCents: 0,
			date: "2026-03-10",
		}).expect(201);
	});

	it("rejeita valor fracionário (deve vir em centavos inteiros)", async () => {
		await post({
			type: "income",
			description: "Fracionado",
			totalValueInCents: 10.5,
			date: "2026-03-10",
		}).expect(400);
	});

	it("rejeita valor negativo", async () => {
		await post({
			type: "income",
			description: "Negativo",
			totalValueInCents: -100,
			date: "2026-03-10",
		}).expect(400);
	});

	it("rejeita categoria com id malformado em vez de estourar 500", async () => {
		await post({
			type: "debit",
			description: "Id inválido",
			totalValueInCents: 1000,
			date: "2026-03-10",
			category: "não-é-um-objectid",
		}).expect(400);
	});

	it("rejeita regex injection na categoria (bug C6)", async () => {
		// No código antigo, category era interpolada direto num $regex:
		// ".*" casava com qualquer categoria e "(" quebrava a query com 500.
		for (const payload of [".*", "(", "^.*$", "a{1000000}"]) {
			await post({
				type: "debit",
				description: "Injection",
				totalValueInCents: 1000,
				date: "2026-03-10",
				category: payload,
			}).expect(400);
		}
	});

	it("rejeita campos não declarados (mass assignment)", async () => {
		await post({
			type: "income",
			description: "Injetada",
			totalValueInCents: 1000,
			date: "2026-03-10",
			user: "000000000000000000000000",
		}).expect(400);
	});
});
