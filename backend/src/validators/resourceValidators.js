const { z } = require("zod");
const { hexColor, cents, dateString } = require("./common");
const { CARD_TYPES } = require("../models/BankCard");

/**
 * Todos os schemas usam .strict(): qualquer campo não declarado faz a
 * requisição falhar com 400, em vez de ser silenciosamente repassado ao banco.
 * É o que fecha a porta do mass assignment (A2).
 */

// ── Categorias ────────────────────────────────────────────────
const createCategorySchema = z
	.object({
		name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(60),
		color: hexColor.optional(),
		icon: z.string().trim().max(40).optional(),
	})
	.strict();

const updateCategorySchema = createCategorySchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe pelo menos um campo para atualizar",
	});

// ── Metas ─────────────────────────────────────────────────────
const createGoalSchema = z
	.object({
		name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
		targetAmountInCents: cents.default(0),
		currentAmountInCents: cents.default(0),
		color: hexColor.optional(),
		deadline: dateString.nullish(),
		description: z.string().trim().max(500).optional(),
	})
	.strict();

const updateGoalSchema = createGoalSchema.partial().refine((data) => Object.keys(data).length > 0, {
	message: "Informe pelo menos um campo para atualizar",
});

// ── Cartões ───────────────────────────────────────────────────
const createBankCardSchema = z
	.object({
		name: z.string().trim().min(1, "Nome do cartão é obrigatório").max(60),
		// Exatamente 4 dígitos. A validação antiga (`length > 4`) aceitava
		// 1, 2 ou 3 dígitos e qualquer caractere não numérico.
		lastFourDigits: z.string().regex(/^\d{4}$/, "Informe exatamente os 4 últimos dígitos"),
		type: z.enum(CARD_TYPES),
		limitInCents: cents.default(0),
		color: hexColor.optional(),
		bank: z.string().trim().max(60).optional(),
	})
	.strict();

const updateBankCardSchema = createBankCardSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe pelo menos um campo para atualizar",
	});

module.exports = {
	createCategorySchema,
	updateCategorySchema,
	createGoalSchema,
	updateGoalSchema,
	createBankCardSchema,
	updateBankCardSchema,
};
