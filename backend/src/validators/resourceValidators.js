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
/** Dia do mês, para fechamento e vencimento da fatura. */
const dayOfMonth = z.number().int().min(1).max(31);

/**
 * O objeto base fica separado do `.refine()` porque `.refine()` devolve um
 * ZodEffects, que não expõe `.partial()`. Derivando os dois schemas do mesmo
 * objeto, a atualização continua podendo ser parcial.
 */
const bankCardFields = z
	.object({
		name: z.string().trim().min(1, "Nome do cartão é obrigatório").max(60),
		// Exatamente 4 dígitos. A validação antiga (`length > 4`) aceitava
		// 1, 2 ou 3 dígitos e qualquer caractere não numérico.
		lastFourDigits: z.string().regex(/^\d{4}$/, "Informe exatamente os 4 últimos dígitos"),
		type: z.enum(CARD_TYPES),
		limitInCents: cents.default(0),
		color: hexColor.optional(),
		bank: z.string().trim().max(60).optional(),
		closingDay: dayOfMonth.nullish(),
		dueDay: dayOfMonth.nullish(),
	})
	.strict();

/**
 * Um dia sem o outro não monta ciclo nenhum; melhor recusar do que aceitar um
 * cartão que depois não consegue gerar fatura.
 *
 * Na atualização a regra só vale quando pelo menos um dos dois é enviado —
 * do contrário, mudar apenas a cor de um cartão sem ciclo seria rejeitado.
 */
const cycleFieldsAreConsistent = (data) => {
	const touchesCycle = "closingDay" in data || "dueDay" in data;
	if (!touchesCycle) return true;
	return (data.closingDay == null) === (data.dueDay == null);
};

const cycleRefinement = {
	message: "Informe o dia de fechamento e o de vencimento juntos",
	path: ["closingDay"],
};

const createBankCardSchema = bankCardFields.refine(cycleFieldsAreConsistent, cycleRefinement);

const updateBankCardSchema = bankCardFields
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe pelo menos um campo para atualizar",
	})
	.refine(cycleFieldsAreConsistent, cycleRefinement);

module.exports = {
	createCategorySchema,
	updateCategorySchema,
	createGoalSchema,
	updateGoalSchema,
	createBankCardSchema,
	updateBankCardSchema,
};
