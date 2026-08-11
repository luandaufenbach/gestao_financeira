import { beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Banco MongoDB real, em memória, criado do zero para cada execução.
 *
 * Preferimos isto a mocks porque os bugs que estamos travando com testes
 * (intervalo de mês em UTC, agregações, índice único com collation) dependem
 * do comportamento real do MongoDB — um mock passaria sem provar nada.
 */

// Definidas antes de qualquer import da aplicação, já que config/env.js
// valida as variáveis no momento em que é carregado.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "chave-de-teste-com-mais-de-32-caracteres-para-passar-na-validacao";
process.env.MONGO_URI = "mongodb://placeholder/test";
process.env.CORS_ORIGINS = "http://localhost:5173";

let mongoServer;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	await mongoose.connect(mongoServer.getUri("gestao_financeira_test"));

	// Cria os índices declarados nos schemas — sem isso, o teste de nome
	// duplicado de categoria passaria por engano.
	await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
});

afterEach(async () => {
	// Isolamento entre testes: limpa os dados, mas preserva os índices.
	const { collections } = mongoose.connection;
	await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer?.stop();
});
