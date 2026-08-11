import { describe, it, expect, beforeEach } from "vitest";
import { app, request, createUser, firstCategoryId } from "./helpers.js";

let user;

beforeEach(async () => {
	user = await createUser();
});

describe("POST /categories", () => {
	it("cria uma categoria", async () => {
		const { body } = await user
			.auth(request(app).post("/categories"))
			.send({ name: "Viagem", color: "#ff0000" })
			.expect(201);

		expect(body.name).toBe("Viagem");
		expect(body.color).toBe("#ff0000");
	});

	it("bloqueia nome duplicado ignorando maiúsculas (bug M10)", async () => {
		await user.auth(request(app).post("/categories")).send({ name: "Viagem" }).expect(201);

		// O índice único antigo era case-sensitive: "viagem" e "Viagem"
		// coexistiam, enquanto o lookup nas transações era case-insensitive.
		await user.auth(request(app).post("/categories")).send({ name: "viagem" }).expect(409);
		await user.auth(request(app).post("/categories")).send({ name: "VIAGEM" }).expect(409);
	});

	it("permite o mesmo nome para usuários diferentes", async () => {
		const outro = await createUser({ email: "outro@exemplo.com" });

		await user.auth(request(app).post("/categories")).send({ name: "Exclusiva" }).expect(201);
		await outro.auth(request(app).post("/categories")).send({ name: "Exclusiva" }).expect(201);
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		await user
			.auth(request(app).post("/categories"))
			.send({ name: "Teste", color: "vermelho" })
			.expect(400);
	});
});

describe("DELETE /categories/:id", () => {
	it("impede excluir categoria em uso e informa quantas transações dependem dela", async () => {
		const categoryId = await firstCategoryId(user.token);

		await user
			.auth(request(app).post("/transactions"))
			.send({
				type: "debit",
				description: "Compra",
				totalValueInCents: 5000,
				date: "2026-03-10",
				category: categoryId,
			})
			.expect(201);

		/**
		 * No modelo antigo a categoria era apagada sem checagem e, como
		 * Transaction.category era uma string livre, a transação ficava órfã:
		 * o gráfico perdia a cor e editá-la falhava com "Categoria não existe",
		 * sem saída para o usuário.
		 */
		const { body } = await user
			.auth(request(app).delete(`/categories/${categoryId}`))
			.expect(409);

		expect(body.message).toMatch(/1 transação/);
	});

	it("permite excluir categoria não utilizada", async () => {
		const { body } = await user
			.auth(request(app).post("/categories"))
			.send({ name: "Sem uso" })
			.expect(201);

		await user.auth(request(app).delete(`/categories/${body._id}`)).expect(200);
	});

	it("não permite excluir categoria de outro usuário", async () => {
		const outro = await createUser({ email: "outro2@exemplo.com" });
		const categoryId = await firstCategoryId(user.token);

		await outro.auth(request(app).delete(`/categories/${categoryId}`)).expect(404);
	});
});

describe("PATCH /goals/:id", () => {
	it("atualiza a meta sem aceitar campos injetados (bug A2)", async () => {
		const criada = await user
			.auth(request(app).post("/goals"))
			.send({ name: "Carro", targetAmountInCents: 5_000_000 })
			.expect(201);

		await user
			.auth(request(app).patch(`/goals/${criada.body._id}`))
			.send({ currentAmountInCents: 1_000_000 })
			.expect(200);

		// O código antigo fazia findByIdAndUpdate(id, req.body) sem allowlist
		// e sem checar o dono do documento.
		await user
			.auth(request(app).patch(`/goals/${criada.body._id}`))
			.send({ user: "000000000000000000000000" })
			.expect(400);
	});

	it("não permite editar meta de outro usuário", async () => {
		const outro = await createUser({ email: "outro3@exemplo.com" });

		const criada = await user
			.auth(request(app).post("/goals"))
			.send({ name: "Privada", targetAmountInCents: 1000 })
			.expect(201);

		await outro
			.auth(request(app).patch(`/goals/${criada.body._id}`))
			.send({ name: "Roubada" })
			.expect(404);
	});
});

describe("POST /bank-cards", () => {
	it("exige exatamente 4 dígitos", async () => {
		const base = { name: "Nubank", type: "credit" };

		await user
			.auth(request(app).post("/bank-cards"))
			.send({ ...base, lastFourDigits: "1234" })
			.expect(201);

		// A validação antiga era `length > 4`, que aceitava tudo isto:
		for (const invalido of ["12", "abcd", "", "123"]) {
			await user
				.auth(request(app).post("/bank-cards"))
				.send({ ...base, lastFourDigits: invalido })
				.expect(400);
		}
	});
});

describe("rotas inexistentes", () => {
	it("devolvem 404 em JSON, não HTML", async () => {
		const { body } = await user.auth(request(app).get("/rota-que-nao-existe")).expect(404);

		expect(body.message).toMatch(/não encontrada/i);
	});
});
