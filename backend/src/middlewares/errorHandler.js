const { ZodError } = require("zod");
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const { isProduction } = require("../config/env");

/**
 * Handler de rota não encontrada. Precisa vir DEPOIS de todas as rotas.
 */
function notFoundHandler(req, res, next) {
	next(AppError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Middleware central de tratamento de erros.
 *
 * MOTIVO (A9): antes, cada controller tinha um try/catch que capturava
 * qualquer erro e devolvia uma mensagem genérica ("Erro ao criar cartão"),
 * na maioria das vezes sem sequer logar. Um erro de validação do Mongoose
 * virava 500, e a causa real era perdida.
 *
 * Aqui cada tipo de erro é traduzido para o status HTTP correto, com o
 * detalhe útil para o cliente e o stack completo no log do servidor.
 */

function errorHandler(error, req, res, next) {
	// Erro de validação do Zod -> 400 com a lista de campos inválidos
	if (error instanceof ZodError) {
		return res.status(400).json({
			message: "Dados inválidos",
			details: error.issues.map((issue) => ({
				field: issue.path.join("."),
				message: issue.message,
			})),
		});
	}

	// ObjectId malformado -> 400, em vez do 500 que o Mongoose geraria
	if (error instanceof mongoose.Error.CastError) {
		return res.status(400).json({
			message: `Valor inválido para o campo '${error.path}'`,
		});
	}

	// Erro de validação de schema do Mongoose -> 400
	if (error instanceof mongoose.Error.ValidationError) {
		return res.status(400).json({
			message: "Dados inválidos",
			details: Object.values(error.errors).map((err) => ({
				field: err.path,
				message: err.message,
			})),
		});
	}

	// Violação de índice único -> 409
	if (error?.code === 11000) {
		const field = Object.keys(error.keyPattern || {}).join(", ");
		return res.status(409).json({
			message: field ? `Já existe um registro com esse ${field}` : "Registro duplicado",
		});
	}

	// Erros que nós mesmos lançamos, já com status correto
	if (error instanceof AppError) {
		return res.status(error.statusCode).json({
			message: error.message,
			...(error.details ? { details: error.details } : {}),
		});
	}

	// Qualquer outra coisa é um bug: loga completo e devolve 500 genérico.
	// A mensagem interna nunca vaza para o cliente em produção.
	console.error("[erro não tratado]", {
		method: req.method,
		url: req.originalUrl,
		message: error?.message,
		stack: error?.stack,
	});

	return res.status(500).json({
		message: "Erro interno do servidor",
		...(isProduction ? {} : { debug: error?.message }),
	});
}

module.exports = { errorHandler, notFoundHandler };
