const { z } = require("zod");

/**
 * Requisitos mínimos de senha.
 *
 * 8 caracteres com letra e número é um piso razoável sem virar um obstáculo.
 * O limite superior de 128 existe porque o bcrypt trunca em 72 bytes e senhas
 * gigantes só servem para gastar CPU do servidor.
 */
const password = z
	.string()
	.min(8, "A senha deve ter pelo menos 8 caracteres")
	.max(128, "A senha deve ter no máximo 128 caracteres")
	.regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
	.regex(/[0-9]/, "A senha deve conter pelo menos um número");

const registerSchema = z
	.object({
		name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
		email: z.string().trim().toLowerCase().email("E-mail inválido").max(254),
		password,
	})
	.strict();

const loginSchema = z
	.object({
		email: z.string().trim().toLowerCase().email("E-mail inválido").max(254),
		// Sem as regras de força aqui: senhas antigas devem continuar podendo logar.
		password: z.string().min(1, "Senha é obrigatória").max(128),
	})
	.strict();

module.exports = { registerSchema, loginSchema };
