const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const { jwtSecret } = require("../config/env");

/**
 * Middleware de autenticação por JWT.
 *
 * MOTIVO (C5): antes NENHUMA rota era protegida e nenhum documento tinha dono.
 * Qualquer pessoa que alcançasse a porta do servidor lia e apagava todos os
 * dados financeiros. Este middleware, combinado com o campo `user` nos models,
 * é o que torna a aplicação multi-usuário e segura.
 *
 * Após passar por aqui, req.userId contém o id do usuário autenticado, e todo
 * controller DEVE usá-lo como filtro nas consultas.
 */
function authenticate(req, res, next) {
	const header = req.headers.authorization || "";

	if (!header.startsWith("Bearer ")) {
		return next(AppError.unauthorized("Token de autenticação ausente"));
	}

	const token = header.slice("Bearer ".length).trim();

	if (!token) {
		return next(AppError.unauthorized("Token de autenticação ausente"));
	}

	try {
		const payload = jwt.verify(token, jwtSecret);
		req.userId = payload.sub;
		return next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return next(AppError.unauthorized("Sessão expirada, faça login novamente"));
		}
		// Não repassamos o detalhe do erro: para um atacante, "assinatura
		// inválida" e "token malformado" são informação útil.
		return next(AppError.unauthorized("Token inválido"));
	}
}

module.exports = authenticate;
