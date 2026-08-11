import { describe, it, expect } from "vitest";
import { app, request, createUser } from "./helpers.js";

describe("POST /auth/register", () => {
	it("cria o usuário, devolve token e semeia as categorias padrão", async () => {
		const response = await request(app)
			.post("/auth/register")
			.send({ name: "Luan", email: "luan@exemplo.com", password: "senha1234" })
			.expect(201);

		expect(response.body.token).toBeTypeOf("string");
		expect(response.body.user.email).toBe("luan@exemplo.com");

		// O hash da senha jamais pode aparecer na resposta.
		expect(response.body.user.passwordHash).toBeUndefined();

		const categories = await request(app)
			.get("/categories")
			.set("Authorization", `Bearer ${response.body.token}`)
			.expect(200);

		expect(categories.body.length).toBeGreaterThan(0);
	});

	it("rejeita senha fraca", async () => {
		const response = await request(app)
			.post("/auth/register")
			.send({ name: "Luan", email: "a@b.com", password: "123" })
			.expect(400);

		expect(response.body.details).toBeDefined();
	});

	it("rejeita e-mail duplicado", async () => {
		const payload = { name: "Luan", email: "dup@exemplo.com", password: "senha1234" };

		await request(app).post("/auth/register").send(payload).expect(201);
		await request(app).post("/auth/register").send(payload).expect(409);
	});

	it("ignora campos não declarados no schema", async () => {
		await request(app)
			.post("/auth/register")
			.send({
				name: "Luan",
				email: "extra@exemplo.com",
				password: "senha1234",
				isAdmin: true, // campo injetado
			})
			.expect(400);
	});
});

describe("POST /auth/login", () => {
	it("autentica com credenciais corretas", async () => {
		await request(app)
			.post("/auth/register")
			.send({ name: "Luan", email: "login@exemplo.com", password: "senha1234" })
			.expect(201);

		const response = await request(app)
			.post("/auth/login")
			.send({ email: "login@exemplo.com", password: "senha1234" })
			.expect(200);

		expect(response.body.token).toBeTypeOf("string");
	});

	it("usa a mesma mensagem para e-mail inexistente e senha errada", async () => {
		await request(app)
			.post("/auth/register")
			.send({ name: "Luan", email: "existe@exemplo.com", password: "senha1234" })
			.expect(201);

		const senhaErrada = await request(app)
			.post("/auth/login")
			.send({ email: "existe@exemplo.com", password: "outrasenha1" })
			.expect(401);

		const emailInexistente = await request(app)
			.post("/auth/login")
			.send({ email: "naoexiste@exemplo.com", password: "senha1234" })
			.expect(401);

		// Mensagens distintas permitiriam enumerar contas cadastradas.
		expect(senhaErrada.body.message).toBe(emailInexistente.body.message);
	});
});

describe("proteção das rotas", () => {
	const rotasProtegidas = [
		["get", "/transactions"],
		["post", "/transactions"],
		["get", "/categories"],
		["get", "/goals"],
		["get", "/bank-cards"],
		["get", "/dashboard/monthly-balance"],
	];

	it.each(rotasProtegidas)("%s %s exige token", async (method, path) => {
		await request(app)[method](path).expect(401);
	});

	it("rejeita token inválido", async () => {
		await request(app)
			.get("/transactions")
			.set("Authorization", "Bearer token.invalido.aqui")
			.expect(401);
	});

	it("/health continua público", async () => {
		await request(app).get("/health").expect(200);
	});
});

describe("isolamento entre usuários", () => {
	it("um usuário nunca enxerga os dados do outro", async () => {
		const ana = await createUser({ email: "ana@exemplo.com" });
		const bob = await createUser({ email: "bob@exemplo.com" });

		const categorias = await ana.auth(request(app).get("/categories")).expect(200);

		await ana
			.auth(request(app).post("/transactions"))
			.send({
				type: "debit",
				description: "Compra da Ana",
				totalValueInCents: 5000,
				date: "2026-03-10",
				category: categorias.body[0]._id,
			})
			.expect(201);

		// Bob não vê a transação da Ana...
		const listaDoBob = await bob.auth(request(app).get("/transactions")).expect(200);
		expect(listaDoBob.body).toHaveLength(0);

		// ...e nem consegue usar a categoria dela.
		await bob
			.auth(request(app).post("/transactions"))
			.send({
				type: "debit",
				description: "Tentativa",
				totalValueInCents: 1000,
				date: "2026-03-10",
				category: categorias.body[0]._id,
			})
			.expect(400);
	});

	it("não permite editar nem apagar transação de outro usuário", async () => {
		const ana = await createUser({ email: "ana2@exemplo.com" });
		const bob = await createUser({ email: "bob2@exemplo.com" });

		const criada = await ana
			.auth(request(app).post("/transactions"))
			.send({
				type: "income",
				description: "Salário da Ana",
				totalValueInCents: 100_000,
				date: "2026-03-10",
			})
			.expect(201);

		await bob
			.auth(request(app).patch(`/transactions/${criada.body._id}`))
			.send({ description: "Sequestrada" })
			.expect(404);

		await bob.auth(request(app).delete(`/transactions/${criada.body._id}`)).expect(404);
	});
});
