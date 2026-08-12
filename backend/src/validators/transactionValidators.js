const { z } = require("zod");
const { objectId, cents, monthQuery, dateString, cycleKey } = require("./common");
const { TRANSACTION_TYPES } = require("../models/Transaction");

/**
 * Teto de parcelas.
 *
 * BUG CORRIGIDO (C4): o backend não validava `installment.total`. O front
 * limitava a 12 pelo atributo `max` do input, que qualquer cliente HTTP ignora.
 * Um POST com total: 1000000 disparava um loop de um milhão de inserts
 * sequenciais — negação de serviço trivial.
 *
 * 72 cobre o maior parcelamento realista (6 anos) com folga.
 */
const MAX_INSTALLMENTS = 72;

const createTransactionSchema = z
	.object({
		type: z.enum(TRANSACTION_TYPES),
		description: z.string().trim().min(1, "Descrição é obrigatória").max(200),
		/**
		 * Valor TOTAL da compra, em centavos.
		 *
		 * Note o nome: `totalValueInCents`, não `value`.
		 *
		 * BUG CORRIGIDO (C1): antes o campo se chamava apenas `value` e era
		 * ambíguo — o front enviava ora o total (ao criar), ora o valor da parcela
		 * (ao editar), e o backend dividia por N nos dois casos. Editar uma parcela
		 * sem alterar nada dividia o valor por N de novo, a cada salvamento.
		 * O nome explícito torna o contrato impossível de confundir.
		 */
		totalValueInCents: cents,
		date: dateString,
		category: objectId.nullish(),
		bankCard: objectId.nullish(),
		/** Obrigatório em invoice_payment: qual fatura este pagamento quita. */
		invoiceCycle: cycleKey.nullish(),
		installments: z.number().int().min(1).max(MAX_INSTALLMENTS).default(1),
	})
	.strict()
	.refine((data) => !["debit", "credit"].includes(data.type) || Boolean(data.category), {
		message: "Categoria é obrigatória para transações de débito e crédito",
		path: ["category"],
	})
	.refine((data) => data.type === "credit" || data.installments === 1, {
		message: "Apenas transações de crédito podem ser parceladas",
		path: ["installments"],
	})
	.refine((data) => data.type !== "invoice_payment" || Boolean(data.bankCard), {
		message: "Informe o cartão da fatura que está sendo paga",
		path: ["bankCard"],
	})
	/**
	 * BUG CORRIGIDO: uma compra no crédito sem cartão não entra em fatura nenhuma.
	 *
	 * O campo era opcional e o formulário nunca o preenchia, então toda compra
	 * nascia com bankCard: null. A fatura é montada filtrando por cartão — sem
	 * ele, a compra some do card de Faturas sem nenhum aviso. Como não existe
	 * compra no crédito sem cartão no mundo real, o vínculo agora é obrigatório.
	 */
	.refine((data) => data.type !== "credit" || Boolean(data.bankCard), {
		message: "Selecione em qual cartão a compra foi feita",
		path: ["bankCard"],
	})
	.refine((data) => data.type !== "invoice_payment" || Boolean(data.invoiceCycle), {
		message: "Informe qual fatura este pagamento quita",
		path: ["invoiceCycle"],
	})
	.refine((data) => data.type === "invoice_payment" || !data.invoiceCycle, {
		message: "Apenas pagamentos de fatura podem informar um ciclo",
		path: ["invoiceCycle"],
	});

const updateTransactionSchema = z
	.object({
		type: z.enum(TRANSACTION_TYPES).optional(),
		description: z.string().trim().min(1, "Descrição não pode ser vazia").max(200).optional(),
		totalValueInCents: cents.optional(),
		date: dateString.optional(),
		category: objectId.nullish(),
		bankCard: objectId.nullish(),
		invoiceCycle: cycleKey.nullish(),
	})
	.strict()
	/**
	 * `installments` não aparece aqui de propósito.
	 *
	 * BUG CORRIGIDO (M8): o modal de edição exibia um campo "Parcelas" editável,
	 * mas o backend ignorava o valor — funcionalidade fantasma. Alterar a
	 * quantidade de parcelas depois de criada exigiria recriar o grupo inteiro,
	 * com datas novas. Em vez de fingir que funciona, o campo foi removido do
	 * front e o schema rejeita o parâmetro explicitamente.
	 */
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe pelo menos um campo para atualizar",
	});

const listTransactionsQuery = monthQuery.extend({
	type: z.enum(TRANSACTION_TYPES).optional(),
	category: objectId.optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
});

/**
 * Escopo da exclusão de uma compra parcelada.
 *
 * BUG CORRIGIDO (C3): antes, excluir qualquer parcela disparava um deleteMany
 * de TODO o grupo, enquanto a interface perguntava apenas "Deseja realmente
 * excluir esta transação?". O usuário perdia 12 parcelas achando que apagava
 * uma. Agora o cliente precisa declarar a intenção, e o padrão é o mais
 * conservador: apagar só a parcela pedida.
 */
const deleteTransactionQuery = z.object({
	scope: z.enum(["single", "group"]).default("single"),
});

module.exports = {
	createTransactionSchema,
	updateTransactionSchema,
	listTransactionsQuery,
	deleteTransactionQuery,
	MAX_INSTALLMENTS,
};
