import request from "supertest";
import app from "../src/app.js";

/**
 * Cria um usuário e devolve o token pronto para uso.
 * O registro já semeia as categorias padrão.
 */
export async function createUser(overrides = {}) {
	const payload = {
		name: "Teste",
		email: `user${Date.now()}${Math.random().toString(36).slice(2, 8)}@exemplo.com`,
		password: "senha1234",
		...overrides,
	};

	const response = await request(app).post("/auth/register").send(payload).expect(201);

	return {
		token: response.body.token,
		user: response.body.user,
		auth: (req) => req.set("Authorization", `Bearer ${response.body.token}`),
	};
}

/** Devolve o id da primeira categoria do usuário. */
export async function firstCategoryId(token) {
	const response = await request(app)
		.get("/categories")
		.set("Authorization", `Bearer ${token}`)
		.expect(200);

	return response.body[0]._id;
}

export { app, request };
