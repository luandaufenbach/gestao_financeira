import { describe, it, expect, beforeEach } from "vitest";
import { app, request, createUser, firstCategoryId } from "./helpers.js";

let user;
let categoryId;

beforeEach(async () => {
	user = await createUser();
	categoryId = await firstCategoryId(user.token);
});

const lancar = (body) => user.auth(request(app).post("/transactions")).send(body).expect(201);
const buscar = (path) => user.auth(request(app).get(path)).expect(200);

describe("GET /dashboard/monthly-balance", () => {
	it("subtrai despesas E valor guardado do saldo disponível", async () => {
		await lancar({
			type: "income",
			description: "Salário",
			totalValueInCents: 500_000,
			date: "2026-03-05",
		});
		await lancar({
			type: "debit",
			description: "Mercado",
			totalValueInCents: 120_000,
			date: "2026-03-06",
			category: categoryId,
		});
		await lancar({
			type: "credit",
			description: "Restaurante",
			totalValueInCents: 30_000,
			date: "2026-03-07",
			category: categoryId,
		});
		await lancar({
			type: "savings",
			description: "Poupança",
			totalValueInCents: 100_000,
			date: "2026-03-08",
		});

		const { body } = await buscar("/dashboard/monthly-balance?year=2026&month=3");

		expect(body.incomeInCents).toBe(500_000);
		expect(body.expenseInCents).toBe(150_000);
		expect(body.savedInCents).toBe(100_000);

		// Disponível: 5000 − 1500 − 1000 = 2500 reais.
		expect(body.balanceInCents).toBe(250_000);

		// Resultado do mês continua ignorando a transferência para a poupança.
		expect(body.netResultInCents).toBe(350_000);
	});

	it("o caso simples: recebeu 500, guardou 200, sobra 300", async () => {
		await lancar({
			type: "income",
			description: "Salário",
			totalValueInCents: 50_000,
			date: "2026-03-05",
		});
		await lancar({
			type: "savings",
			description: "Guardado",
			totalValueInCents: 20_000,
			date: "2026-03-06",
		});

		const { body } = await buscar("/dashboard/monthly-balance?year=2026&month=3");

		expect(body.balanceInCents).toBe(30_000);
	});

	it("devolve zero quando o mês está vazio", async () => {
		const { body } = await buscar("/dashboard/monthly-balance?year=2030&month=1");

		expect(body.balanceInCents).toBe(0);
	});

	it("não mistura os meses", async () => {
		await lancar({
			type: "income",
			description: "Março",
			totalValueInCents: 100_000,
			date: "2026-03-01",
		});
		await lancar({
			type: "income",
			description: "Abril",
			totalValueInCents: 200_000,
			date: "2026-04-01",
		});

		const marco = await buscar("/dashboard/monthly-balance?year=2026&month=3");
		const abril = await buscar("/dashboard/monthly-balance?year=2026&month=4");

		expect(marco.body.balanceInCents).toBe(100_000);
		expect(abril.body.balanceInCents).toBe(200_000);
	});

	it("mantém a soma exata em centavos após parcelamento", async () => {
		// R$100 em 3x. Com floats, a soma daria 99.99999... ou 100.00000000000001.
		await lancar({
			type: "credit",
			description: "Parcelado",
			totalValueInCents: 10_000,
			date: "2026-03-10",
			category: categoryId,
			installments: 3,
		});

		const marco = await buscar("/dashboard/monthly-balance?year=2026&month=3");
		const abril = await buscar("/dashboard/monthly-balance?year=2026&month=4");
		const maio = await buscar("/dashboard/monthly-balance?year=2026&month=5");

		const total =
			marco.body.expenseInCents + abril.body.expenseInCents + maio.body.expenseInCents;

		expect(total).toBe(10_000);
	});
});

describe("GET /dashboard/category-breakdown", () => {
	it("agrupa por categoria trazendo nome e cor numa única consulta", async () => {
		const categorias = await buscar("/categories");
		const [mercado, combustivel] = categorias.body;

		await lancar({
			type: "debit",
			description: "Feira",
			totalValueInCents: 20_000,
			date: "2026-03-05",
			category: mercado._id,
		});
		await lancar({
			type: "debit",
			description: "Supermercado",
			totalValueInCents: 30_000,
			date: "2026-03-06",
			category: mercado._id,
		});
		await lancar({
			type: "credit",
			description: "Posto",
			totalValueInCents: 15_000,
			date: "2026-03-07",
			category: combustivel._id,
		});

		const { body } = await buscar("/dashboard/category-breakdown?year=2026&month=3");

		expect(body).toHaveLength(2);
		// Ordenado do maior gasto para o menor.
		expect(body[0]).toMatchObject({
			category: mercado.name,
			color: mercado.color,
			totalInCents: 50_000,
		});
		expect(body[1].totalInCents).toBe(15_000);
	});

	it("ignora receitas e valores guardados", async () => {
		await lancar({
			type: "income",
			description: "Salário",
			totalValueInCents: 500_000,
			date: "2026-03-05",
		});

		const { body } = await buscar("/dashboard/category-breakdown?year=2026&month=3");

		expect(body).toHaveLength(0);
	});
});

describe("GET /dashboard/saved-money", () => {
	it("separa o guardado do mês do acumulado total", async () => {
		await lancar({
			type: "savings",
			description: "Fev",
			totalValueInCents: 10_000,
			date: "2026-02-10",
		});
		await lancar({
			type: "savings",
			description: "Mar",
			totalValueInCents: 25_000,
			date: "2026-03-10",
		});

		const mes = await buscar("/dashboard/saved-money?year=2026&month=3");
		const total = await buscar("/dashboard/saved-money-total");

		expect(mes.body.savedInCents).toBe(25_000);
		expect(total.body.savedInCents).toBe(35_000);
	});
});

describe("validação da query", () => {
	it("rejeita mês fora do intervalo em vez de estourar 500", async () => {
		await user.auth(request(app).get("/dashboard/monthly-balance?month=13")).expect(400);
		await user.auth(request(app).get("/dashboard/monthly-balance?month=abc")).expect(400);
	});
});
