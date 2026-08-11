/**
 * Middleware de validação com Zod.
 *
 * MOTIVO (A2 — mass assignment): antes, `updateGoal` fazia
 * `Goal.findByIdAndUpdate(id, req.body)`, repassando o corpo inteiro da
 * requisição direto para o banco. Um cliente podia injetar qualquer campo.
 *
 * O Zod resolve os dois problemas de uma vez: valida os tipos E descarta
 * (por padrão, com .strict() nos schemas) tudo que não estiver declarado.
 * O resultado sanitizado substitui req.body / req.query.
 */
const validate = (schemas) => (req, res, next) => {
	try {
		if (schemas.body) {
			req.body = schemas.body.parse(req.body);
		}
		if (schemas.query) {
			// Em Express 5 req.query é um getter somente-leitura;
			// guardamos o resultado validado em req.validatedQuery.
			req.validatedQuery = schemas.query.parse(req.query);
		}
		if (schemas.params) {
			req.params = schemas.params.parse(req.params);
		}
		return next();
	} catch (error) {
		return next(error);
	}
};

module.exports = validate;
