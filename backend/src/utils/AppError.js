/**
 * Erro de aplicação com status HTTP associado.
 *
 * Permite que os controllers apenas lancem o erro e deixem o middleware
 * central de erros traduzir para a resposta HTTP, em vez de repetir
 * try/catch com res.status(...) em cada função.
 */
class AppError extends Error {
	constructor(statusCode, message, details = undefined) {
		super(message);
		this.name = "AppError";
		this.statusCode = statusCode;
		this.details = details;
		// Marca erros esperados (validação, não encontrado) para não poluir os logs
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}

	static badRequest(message, details) {
		return new AppError(400, message, details);
	}

	static unauthorized(message = "Não autenticado") {
		return new AppError(401, message);
	}

	static forbidden(message = "Acesso negado") {
		return new AppError(403, message);
	}

	static notFound(message = "Recurso não encontrado") {
		return new AppError(404, message);
	}

	static conflict(message) {
		return new AppError(409, message);
	}
}

module.exports = AppError;
