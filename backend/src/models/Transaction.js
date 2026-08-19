const mongoose = require("mongoose");

/**
 * Tipos de transação.
 *
 * `savings` e `withdrawal` formam um par simétrico de TRANSFERÊNCIA entre a
 * conta corrente e a reserva:
 *
 *   savings    conta corrente -> reserva   (tira do disponível, soma na reserva)
 *   withdrawal reserva -> conta corrente   (soma no disponível, tira da reserva)
 *
 * Sem o `withdrawal`, o valor guardado só crescia: quem tirasse dinheiro da
 * poupança não tinha como registrar, e o total acumulado virava ficção com o
 * tempo. Nenhum dos dois é receita ou despesa — o patrimônio não muda, só o
 * bolso onde o dinheiro está.
 */
const TRANSACTION_TYPES = ["debit", "credit", "income", "savings", "withdrawal", "invoice_payment"];

/** Tipos que exigem categoria e representam gasto de verdade. */
const EXPENSE_TYPES = ["debit", "credit"];

/** Movimentam a reserva. */
const SAVINGS_TYPES = ["savings", "withdrawal"];

/**
 * Tipos que são TRANSFERÊNCIA, não despesa nem receita.
 *
 * Nenhum deles altera o patrimônio — apenas movem dinheiro entre bolsos:
 *   savings/withdrawal  conta corrente <-> reserva
 *   invoice_payment     conta corrente -> quitação da fatura
 *
 * O pagamento de fatura em especial NÃO é despesa: a despesa aconteceu lá
 * atrás, quando a compra no crédito foi feita. Contá-lo como gasto somaria o
 * mesmo dinheiro duas vezes — em julho pela compra e em agosto pelo pagamento.
 */
const TRANSFER_TYPES = ["savings", "withdrawal", "invoice_payment"];

const TransactionSchema = new mongoose.Schema(
	{
		// MUDANÇA (C5): escopo por usuário.
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		type: {
			type: String,
			enum: {
				values: TRANSACTION_TYPES,
				message: `Tipo deve ser um de: ${TRANSACTION_TYPES.join(", ")}`,
			},
			required: true,
		},

		/**
		 * MUDANÇA (A7): antes era uma String livre com o nome da categoria.
		 *
		 * Consequência do modelo antigo: apagar a categoria "Mercado" deixava as
		 * transações apontando para um nome inexistente. O gráfico perdia a cor e,
		 * pior, editar aquela transação passava a falhar com "Categoria não existe"
		 * sem que o usuário tivesse como corrigir.
		 *
		 * Agora é uma referência real. A exclusão de categoria em uso é bloqueada
		 * pelo controller, e renomear a categoria reflete em todas as transações
		 * automaticamente.
		 */
		category: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Category",
			default: null,
			required: [
				function requiredCategory() {
					return EXPENSE_TYPES.includes(this.type);
				},
				"Categoria é obrigatória para transações de débito e crédito",
			],
		},

		/**
		 * Cartão usado. Opcional em compras, OBRIGATÓRIO em pagamento de fatura —
		 * não existe pagar "a fatura" sem dizer de qual cartão.
		 */
		bankCard: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BankCard",
			default: null,
			required: [
				function requiredBankCard() {
					return this.type === "invoice_payment";
				},
				"Informe o cartão da fatura",
			],
		},

		/**
		 * Meta para a qual o valor foi guardado, ou de onde foi resgatado.
		 *
		 * Opcional e exclusivo de savings/withdrawal: guardar sem destino é o
		 * caso comum — o dinheiro vai para a reserva geral e pronto. Quando a
		 * meta é informada, o progresso dela anda junto com a transação (ver
		 * applyGoalDelta, em transactionController).
		 *
		 * A relação é a mesma de bankCard nas compras no crédito: quem manda é
		 * a transação; a meta só é o destino apontado.
		 */
		goal: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Goal",
			default: null,
		},

		/**
		 * Ciclo da fatura que este pagamento quita, no formato "2026-08"
		 * (ano-mês do vencimento). Preenchido apenas em `invoice_payment`.
		 *
		 * É isto que permite o pagamento parcial/antecipado sem nenhuma peça
		 * extra: vários pagamentos apontam para o mesmo ciclo, e o status da
		 * fatura sai da soma deles. Nenhuma coleção de faturas é necessária —
		 * a fatura é calculada, só o pagamento é armazenado.
		 */
		invoiceCycle: {
			type: String,
			default: null,
			match: [/^\d{4}-\d{2}$/, "Ciclo deve estar no formato AAAA-MM"],
			required: [
				function requiredCycle() {
					return this.type === "invoice_payment";
				},
				"Informe o ciclo da fatura",
			],
		},

		description: {
			type: String,
			required: [true, "Descrição é obrigatória"],
			trim: true,
			maxlength: 200,
		},

		/**
		 * MUDANÇA (C7): valor em CENTAVOS, como inteiro.
		 *
		 * Antes era Number (float64), o que causava dois defeitos reais:
		 *   - R$100 em 3x gravava 33.333333333333336 no banco;
		 *   - a soma das parcelas nunca fechava com o total.
		 * Ver backend/src/utils/money.js.
		 */
		valueInCents: {
			type: Number,
			required: true,
			min: [0, "Valor não pode ser negativo"],
			validate: {
				validator: Number.isInteger,
				message: "Valor deve ser um inteiro em centavos",
			},
		},

		/** Sempre normalizada para meia-noite UTC. Ver utils/date.js (C2). */
		date: {
			type: Date,
			required: [true, "Data é obrigatória"],
		},

		installment: {
			total: { type: Number, default: 1, min: 1, max: 72 },
			current: { type: Number, default: 1, min: 1 },

			/**
			 * Valor TOTAL da compra, em centavos, replicado em cada parcela.
			 *
			 * Poderia ser derivado, mas não de forma confiável: como o resto da
			 * divisão é distribuído entre as primeiras parcelas, multiplicar uma
			 * parcela pelo número de parcelas dá um valor errado
			 * (3334 × 3 = 10002, não 10000).
			 *
			 * Guardar o total explicitamente é o que permite ao formulário de
			 * edição exibir o valor original da compra sem inferência — a
			 * inferência era exatamente a origem do bug C1.
			 */
			totalValueInCents: {
				type: Number,
				required: true,
				min: 0,
				validate: {
					validator: Number.isInteger,
					message: "Valor total deve ser um inteiro em centavos",
				},
			},
		},

		/** Agrupa as parcelas de uma mesma compra parcelada. */
		installmentGroupId: {
			type: String,
			default: null,
		},
	},
	{ timestamps: true }
);

/**
 * ÍNDICES (A4): antes não havia nenhum, e todas as consultas faziam
 * collection scan. Estes cobrem exatamente os padrões de acesso da aplicação.
 */

// Listagem de transações do mês e agregações do dashboard.
TransactionSchema.index({ user: 1, date: -1 });

// Dashboard filtrando por tipo dentro do mês (fatura, guardado, breakdown).
TransactionSchema.index({ user: 1, type: 1, date: -1 });

// Busca das parcelas irmãs ao editar/excluir uma compra parcelada.
// Parcial: a maioria das transações não é parcelada e fica fora do índice.
TransactionSchema.index(
	{ user: 1, installmentGroupId: 1 },
	{ partialFilterExpression: { installmentGroupId: { $type: "string" } } }
);

// Verificação de "categoria está em uso?" antes de permitir a exclusão.
TransactionSchema.index(
	{ user: 1, category: 1 },
	{ partialFilterExpression: { category: { $type: "objectId" } } }
);

// Montagem das faturas: compras de um cartão dentro de um intervalo de datas.
TransactionSchema.index(
	{ user: 1, bankCard: 1, date: -1 },
	{ partialFilterExpression: { bankCard: { $type: "objectId" } } }
);

// Transações de uma meta: acerto do progresso e desvínculo ao excluir a meta.
TransactionSchema.index(
	{ user: 1, goal: 1 },
	{ partialFilterExpression: { goal: { $type: "objectId" } } }
);

// Somatório dos pagamentos por ciclo, para descobrir o status da fatura.
TransactionSchema.index(
	{ user: 1, bankCard: 1, invoiceCycle: 1 },
	{ partialFilterExpression: { invoiceCycle: { $type: "string" } } }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.EXPENSE_TYPES = EXPENSE_TYPES;
module.exports.SAVINGS_TYPES = SAVINGS_TYPES;
module.exports.TRANSFER_TYPES = TRANSFER_TYPES;
