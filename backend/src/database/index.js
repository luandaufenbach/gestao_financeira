const mongoose = require("mongoose");
const { mongoUri, isProduction } = require("../config/env");

/**
 * Falhar rápido em vez de enfileirar operações indefinidamente.
 * Sem isso, uma query com o banco fora do ar fica pendurada por 30s (padrão).
 */
mongoose.set("bufferTimeoutMS", 5000);

// Em produção, um campo não declarado no schema deve ser um erro explícito,
// não algo descartado em silêncio.
mongoose.set("strictQuery", true);

async function connectDB(uri = mongoUri) {
	mongoose.connection.on("error", (error) => {
		console.error("Erro na conexão com o MongoDB:", error.message);
	});

	mongoose.connection.on("disconnected", () => {
		console.warn("MongoDB desconectado.");
	});

	await mongoose.connect(uri, {
		serverSelectionTimeoutMS: 10_000,
		// Pool dimensionado para uma app pequena; ajuste conforme a carga real.
		maxPoolSize: 10,
		minPoolSize: 1,
	});

	/**
	 * Sincroniza os índices declarados nos schemas com o banco.
	 *
	 * MOTIVO (A4): antes não havia índice nenhum e toda consulta fazia
	 * collection scan. Em produção o ideal é criar os índices por migração
	 * controlada — syncIndexes em uma base grande pode travar a aplicação —,
	 * por isso aqui roda apenas fora de produção.
	 */
	if (!isProduction) {
		await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
	}

	console.log("MongoDB conectado");
	return mongoose.connection;
}

async function disconnectDB() {
	await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
