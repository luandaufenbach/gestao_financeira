const crypto = require("node:crypto");
const mongoose = require("mongoose");

const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const BankCard = require("../models/BankCard");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { getMonthRangeUTC, normalizeToUTCDay, addMonthsUTC } = require("../utils/date");
const { splitIntoInstallments } = require("../utils/money");

const EXPENSE_TYPES = ["debit", "credit"];
const isExpenseType = (type) => EXPENSE_TYPES.includes(type);

/**
 * Confirma que a categoria existe E pertence ao usuário.
 *
 * BUG CORRIGIDO (C6 — regex injection): a versão anterior buscava com
 *   { $regex: `^${category}$`, $options: "i" }
 * montando um regex a partir de texto cru do cliente. Com category = ".*"
 * qualquer categoria dava match; com "(" a query estourava com erro de sintaxe
 * de regex (500); e padrões aninhados abriam espaço para ReDoS.
 *
 * Agora a categoria é um ObjectId (A7) e a busca é por igualdade — não há
 * string interpolada em lugar nenhum.
 */
async function resolveCategory(categoryId, userId) {
	if (!categoryId) return null;

	const category = await Category.findOne({ _id: categoryId, user: userId }).select("_id").lean();

	if (!category) {
		throw AppError.badRequest("Categoria não encontrada");
	}
	return category._id;
}

/**
 * Mesma checagem de posse para o cartão vinculado.
 *
 * `mustBeCredit` é usado nas compras parceladas/no crédito: vincular a compra a
 * um cartão de débito faria a fatura procurá-la num cartão que não tem fatura.
 */
async function resolveBankCard(bankCardId, userId, { mustBeCredit = false } = {}) {
	if (!bankCardId) return null;

	const card = await BankCard.findOne({ _id: bankCardId, user: userId }).select("_id type").lean();

	if (!card) {
		throw AppError.badRequest("Cartão não encontrado");
	}
	if (mustBeCredit && card.type !== "credit") {
		throw AppError.badRequest("Compras no crédito precisam de um cartão de crédito");
	}
	return card._id;
}

/**
 * Valida um pagamento de fatura.
 *
 * O cartão precisa ser de crédito E ter o ciclo configurado — sem os dias de
 * fechamento e vencimento não existe fatura para pagar.
 */
async function assertInvoicePaymentIsValid(bankCardId, userId) {
	const card = await BankCard.findOne({ _id: bankCardId, user: userId });

	if (!card) {
		throw AppError.badRequest("Cartão não encontrado");
	}
	if (card.type !== "credit") {
		throw AppError.badRequest("Apenas cartões de crédito têm fatura");
	}
	if (!card.hasInvoiceCycle()) {
		throw AppError.badRequest(
			"Configure o dia de fechamento e o de vencimento do cartão antes de registrar pagamentos."
		);
	}

	return card;
}

/**
 * Saldo atual da reserva: tudo que foi guardado menos tudo que foi resgatado.
 *
 * @param {string} userId
 * @param {string} [excludeId] - Transação a ignorar. Usado na edição, para que a
 *   própria transação sendo alterada não conte no saldo contra o qual ela é
 *   validada.
 */
async function getNetSavings(userId, excludeId) {
	const match = {
		user: new mongoose.Types.ObjectId(String(userId)),
		type: { $in: ["savings", "withdrawal"] },
	};

	if (excludeId) {
		match._id = { $ne: new mongoose.Types.ObjectId(String(excludeId)) };
	}

	const [result] = await Transaction.aggregate([
		{ $match: match },
		{
			$group: {
				_id: null,
				total: {
					$sum: {
						$cond: [
							{ $eq: ["$type", "savings"] },
							"$valueInCents",
							{ $multiply: ["$valueInCents", -1] },
						],
					},
				},
			},
		},
	]);

	return result?.total ?? 0;
}

const formatCents = (cents) =>
	(cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Impede resgatar mais do que existe guardado.
 *
 * Sem isso o saldo da reserva ficaria negativo, o que não significa nada: você
 * não pode tirar da poupança dinheiro que nunca colocou. Melhor recusar na hora,
 * com o valor disponível na mensagem, do que exibir um número sem sentido.
 */
async function assertWithdrawalIsCovered(userId, valueInCents, excludeId) {
	const available = await getNetSavings(userId, excludeId);

	if (valueInCents > available) {
		throw AppError.badRequest(
			`Você tem ${formatCents(available)} guardado e está tentando resgatar ${formatCents(
				valueInCents
			)}.`
		);
	}
}

const listTransactions = asyncHandler(async (req, res) => {
	const { year, month, type, category, limit } = req.validatedQuery;

	// Toda consulta é obrigatoriamente escopada pelo usuário autenticado (C5).
	const query = { user: req.userId };

	if (year || month) {
		const { start, end } = getMonthRangeUTC(year, month);
		query.date = { $gte: start, $lte: end };
	}
	if (type) query.type = type;
	if (category) query.category = category;

	const transactions = await Transaction.find(query)
		.populate("category", "name color icon")
		.populate("bankCard", "name bank lastFourDigits color")
		.sort({ date: -1, createdAt: -1 })
		// Teto padrão: antes a rota devolvia a coleção inteira sem limite algum,
		// o que degrada linearmente conforme o histórico cresce (escalabilidade).
		.limit(limit ?? 500)
		.lean();

	return res.json(transactions);
});

const createTransaction = asyncHandler(async (req, res) => {
	const { type, description, totalValueInCents, date, installments } = req.body;
	const userId = req.userId;

	const categoryId = isExpenseType(type)
		? await resolveCategory(req.body.category, userId)
		: null;
	const bankCardId = await resolveBankCard(req.body.bankCard, userId, {
		mustBeCredit: type === "credit",
	});

	if (type === "withdrawal") {
		await assertWithdrawalIsCovered(userId, totalValueInCents);
	}

	if (type === "invoice_payment") {
		await assertInvoicePaymentIsValid(bankCardId, userId);
	}

	// Ancora a data em meia-noite UTC para que o dia gravado seja exatamente
	// o dia escolhido pelo usuário, em qualquer fuso de servidor (C2).
	const startDate = normalizeToUTCDay(date);
	if (!startDate) {
		throw AppError.badRequest("Data inválida");
	}

	const base = {
		user: userId,
		type,
		description,
		category: categoryId,
		bankCard: bankCardId,
		// Só pagamentos de fatura carregam ciclo; o validador já garante isso.
		invoiceCycle: type === "invoice_payment" ? req.body.invoiceCycle : null,
	};

	// Caminho simples: transação à vista.
	if (installments === 1) {
		const created = await Transaction.create({
			...base,
			valueInCents: totalValueInCents,
			date: startDate,
			// À vista, o total da compra é o próprio valor da transação.
			installment: { total: 1, current: 1, totalValueInCents },
			installmentGroupId: null,
		});

		return res.status(201).json(created);
	}

	/**
	 * Compra parcelada.
	 *
	 * BUG CORRIGIDO (C7): antes o valor de cada parcela era `value / total`,
	 * gravando dízimas (R$100 em 3x = 33.333333333333336) e a soma das parcelas
	 * nunca fechava com o total. splitIntoInstallments distribui o resto em
	 * centavos inteiros, garantindo soma exata.
	 *
	 * BUG CORRIGIDO (C4): o loop anterior fazia N awaits sequenciais de create().
	 * insertMany é uma única ida ao banco.
	 */
	const parcels = splitIntoInstallments(totalValueInCents, installments);
	const installmentGroupId = crypto.randomUUID();

	const documents = parcels.map((valueInCents, index) => ({
		...base,
		valueInCents,
		// addMonthsUTC trata o estouro de dia: 31/01 + 1 mês vira 28/02,
		// e não 03/03 como faria o setMonth() nativo.
		date: addMonthsUTC(startDate, index),
		installment: { total: installments, current: index + 1, totalValueInCents },
		installmentGroupId,
	}));

	const created = await Transaction.insertMany(documents, { ordered: true });

	return res.status(201).json({
		installmentGroupId,
		totalValueInCents,
		installments,
		transactions: created,
	});
});

const updateTransaction = asyncHandler(async (req, res) => {
	const userId = req.userId;

	const existing = await Transaction.findOne({ _id: req.params.id, user: userId });
	if (!existing) {
		throw AppError.notFound("Transação não encontrada");
	}

	const nextType = req.body.type ?? existing.type;

	/**
	 * Um resgate editado precisa continuar cabendo na reserva.
	 *
	 * Validado ANTES de montar o update, para falhar cedo e sem trabalho à toa.
	 *
	 * `existing._id` é excluído do cálculo para que o valor antigo desta mesma
	 * transação não conte contra ela — do contrário, aumentar um resgate de
	 * R$ 100 para R$ 150 seria comparado com uma reserva que ainda desconta os
	 * R$ 100 originais.
	 */
	if (nextType === "withdrawal") {
		await assertWithdrawalIsCovered(
			userId,
			req.body.totalValueInCents ?? existing.valueInCents,
			existing._id
		);
	}

	/**
	 * Primeiro resolvemos TUDO que depende do banco, depois montamos o update.
	 *
	 * Separar as duas fases mantém a montagem síncrona e linear: não há como um
	 * `await` no meio deixar o objeto num estado parcial, e o leitor consegue
	 * ver a forma final do update de uma vez só.
	 */
	const nextBankCard =
		req.body.bankCard !== undefined
			? await resolveBankCard(req.body.bankCard, userId, { mustBeCredit: nextType === "credit" })
			: existing.bankCard;

	// O ciclo acompanha o tipo: só pagamento de fatura tem fatura para quitar.
	if (nextType === "invoice_payment") {
		await assertInvoicePaymentIsValid(nextBankCard, userId);
	}

	/**
	 * Sem cartão a compra não entra em fatura nenhuma — a mesma regra da criação.
	 * Isso também é o que puxa para a superfície os lançamentos antigos, criados
	 * quando o formulário ainda não tinha o campo: ao editar, o cartão é exigido.
	 */
	if (nextType === "credit" && !nextBankCard) {
		throw AppError.badRequest("Selecione em qual cartão a compra foi feita");
	}

	// A categoria acompanha o tipo: receita e transferências não têm categoria.
	let nextCategory = null;
	if (isExpenseType(nextType)) {
		const categoryId = req.body.category !== undefined ? req.body.category : existing.category;
		nextCategory = await resolveCategory(categoryId, userId);

		if (!nextCategory) {
			throw AppError.badRequest("Categoria é obrigatória para débito e crédito");
		}
	}

	let nextDate;
	if (req.body.date !== undefined) {
		nextDate = normalizeToUTCDay(req.body.date);
		if (!nextDate) throw AppError.badRequest("Data inválida");
	}

	// Monta o update campo a campo, a partir do body já validado pelo Zod.
	// Nunca repassamos req.body direto para o banco (A2 — mass assignment).
	const updates = { category: nextCategory };

	if (req.body.description !== undefined) updates.description = req.body.description;
	if (req.body.type !== undefined) updates.type = req.body.type;
	if (req.body.bankCard !== undefined) updates.bankCard = nextBankCard;
	if (nextDate) updates.date = nextDate;

	if (nextType === "invoice_payment") {
		if (req.body.invoiceCycle !== undefined) updates.invoiceCycle = req.body.invoiceCycle;
	} else {
		updates.invoiceCycle = null;
	}

	const isInstallmentGroup = Boolean(existing.installmentGroupId);

	/**
	 * Transação à vista: atualização direta.
	 */
	if (!isInstallmentGroup) {
		if (req.body.totalValueInCents !== undefined) {
			updates.valueInCents = req.body.totalValueInCents;
			// Mantém o total sincronizado com o valor (à vista são o mesmo).
			updates["installment.totalValueInCents"] = req.body.totalValueInCents;
		}

		const updated = await Transaction.findOneAndUpdate(
			{ _id: existing._id, user: userId },
			updates,
			{ returnDocument: "after", runValidators: true }
		)
			.populate("category", "name color icon")
			.populate("bankCard", "name bank lastFourDigits color");

		return res.json(updated);
	}

	/**
	 * Compra parcelada.
	 *
	 * BUG CORRIGIDO (C1): a versão anterior recebia `value` (que o front
	 * preenchia com o valor JÁ dividido da parcela) e fazia `value / N` outra
	 * vez, corrompendo o valor a cada edição. Agora o campo é `totalValueInCents`
	 * — o total da compra — e a divisão acontece uma única vez, aqui.
	 *
	 * As datas e o número de cada parcela são preservados: só o rateio muda.
	 */
	const siblings = await Transaction.find({
		user: userId,
		installmentGroupId: existing.installmentGroupId,
	})
		.sort({ "installment.current": 1 })
		.select("_id");

	// Calcula o rateio uma única vez, não uma vez por parcela.
	const newParcels =
		req.body.totalValueInCents !== undefined
			? splitIntoInstallments(req.body.totalValueInCents, siblings.length)
			: null;

	const bulkOperations = siblings.map((sibling, index) => {
		const perParcel = { ...updates };

		if (newParcels) {
			perParcel.valueInCents = newParcels[index];
			// O total da compra é o mesmo em todas as parcelas do grupo.
			perParcel["installment.totalValueInCents"] = req.body.totalValueInCents;
		}

		// `date` nunca é propagada: cada parcela tem o próprio vencimento.
		delete perParcel.date;

		return {
			updateOne: {
				filter: { _id: sibling._id, user: userId },
				update: { $set: perParcel },
			},
		};
	});

	if (bulkOperations.length > 0) {
		await Transaction.bulkWrite(bulkOperations);
	}

	const updated = await Transaction.findById(existing._id)
		.populate("category", "name color icon")
		.populate("bankCard", "name bank lastFourDigits color");

	return res.json(updated);
});

const deleteTransaction = asyncHandler(async (req, res) => {
	const userId = req.userId;
	const { scope } = req.validatedQuery;

	const target = await Transaction.findOne({ _id: req.params.id, user: userId });
	if (!target) {
		throw AppError.notFound("Transação não encontrada");
	}

	/**
	 * BUG CORRIGIDO (C3): antes, excluir qualquer parcela apagava o grupo
	 * inteiro automaticamente, enquanto a UI perguntava apenas "excluir esta
	 * transação?". Agora o escopo é explícito e o padrão ("single") é o menos
	 * destrutivo — apagar o grupo exige ?scope=group.
	 */
	if (scope === "group" && target.installmentGroupId) {
		const result = await Transaction.deleteMany({
			user: userId,
			installmentGroupId: target.installmentGroupId,
		});

		return res.json({
			message: "Compra parcelada removida",
			deletedCount: result.deletedCount,
		});
	}

	await Transaction.deleteOne({ _id: target._id, user: userId });

	return res.json({ message: "Transação removida", deletedCount: 1 });
});

module.exports = {
	listTransactions,
	createTransaction,
	updateTransaction,
	deleteTransaction,
};

// Exportado para reuso nas agregações do dashboard.
module.exports.toObjectId = (id) => new mongoose.Types.ObjectId(String(id));
