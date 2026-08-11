/**
 * Envolve um handler assíncrono e encaminha qualquer rejeição para o next().
 *
 * O Express 5 já encaminha promises rejeitadas automaticamente, mas manter o
 * wrapper explícito deixa a intenção clara e mantém o código portável.
 *
 * Substitui os try/catch repetidos em todos os controllers, que engoliam o
 * erro real e devolviam sempre a mesma mensagem genérica de 500.
 */
const asyncHandler = (handler) => (req, res, next) =>
	Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
