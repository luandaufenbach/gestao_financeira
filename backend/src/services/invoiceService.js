const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { cycleRange, recentCycles, cycleLabel } = require("../utils/invoiceCycle");

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Serviço de faturas.
 *
 * DECISÃO DE MODELAGEM: a fatura NÃO é uma coleção no banco. Ela é calculada
 * a partir de três coisas que já existem — o ciclo do cartão, as compras de
 * crédito no intervalo e os pagamentos marcados com aquele ciclo.
 *
 * O motivo é manutenção: se a fatura fosse um documento com o total gravado,
 * cada edição ou exclusão de compra teria que atualizá-lo, e qualquer caminho
 * esquecido deixaria o total mentindo. Sendo derivada, é impossível ficar
 * dessincronizada.
 *
 * O que se armazena é apenas o pagamento (uma transação `invoice_payment`
 * com `invoiceCycle`). Como vários pagamentos podem apontar para o mesmo
 * ciclo, o pagamento parcial e o antecipado funcionam sem nenhuma peça extra.
 */

/** aberta | parcial | paga | vencida */
function resolveStatus({ totalInCents, paidInCents, dueDate }, now = new Date()) {
	// Fatura sem compras e sem pagamento nem chega a existir para o usuário.
	if (totalInCents === 0 && paidInCents === 0) return "vazia";

	if (paidInCents >= totalInCents && totalInCents > 0) return "paga";
	if (paidInCents > 0) return dueDate < now ? "vencida" : "parcial";

	return dueDate < now ? "vencida" : "aberta";
}

/**
 * Soma das compras de crédito de cada ciclo, em UMA consulta.
 *
 * `$bucket` divide as transações pelas fronteiras dos ciclos, então N faturas
 * custam uma ida ao banco em vez de N. As fronteiras são os inícios de cada
 * ciclo mais o fim do último, em ordem crescente.
 */
async function sumPurchasesByCycle(userId, cardId, ranges) {
	if (ranges.length === 0) return new Map();

	const ascending = [...ranges].sort((a, b) => a.start - b.start);

	/**
	 * A última fronteira leva +1ms porque o `$bucket` trata o limite superior
	 * como EXCLUSIVO. Sem isso, uma compra feita exatamente no instante do
	 * fechamento cairia no bucket "fora" e sumiria da fatura.
	 */
	const lastEnd = ascending[ascending.length - 1].end;
	const boundaries = [...ascending.map((r) => r.start), new Date(lastEnd.getTime() + 1)];

	const buckets = await Transaction.aggregate([
		{
			$match: {
				user: toObjectId(userId),
				bankCard: toObjectId(cardId),
				type: "credit",
				date: { $gte: boundaries[0], $lte: boundaries[boundaries.length - 1] },
			},
		},
		{
			$bucket: {
				groupBy: "$date",
				boundaries,
				default: "fora",
				output: {
					totalInCents: { $sum: "$valueInCents" },
					transactionCount: { $sum: 1 },
				},
			},
		},
	]);

	// O _id de cada bucket é a fronteira inferior, ou seja, o início do ciclo.
	const byStart = new Map(
		buckets.filter((b) => b._id !== "fora").map((b) => [new Date(b._id).getTime(), b])
	);

	return new Map(
		ascending.map((range) => {
			const bucket = byStart.get(range.start.getTime());
			return [
				range.cycle,
				{
					totalInCents: bucket?.totalInCents ?? 0,
					transactionCount: bucket?.transactionCount ?? 0,
				},
			];
		})
	);
}

/** Soma dos pagamentos já registrados, agrupada por ciclo. */
async function sumPaymentsByCycle(userId, cardId, cycles) {
	const rows = await Transaction.aggregate([
		{
			$match: {
				user: toObjectId(userId),
				bankCard: toObjectId(cardId),
				type: "invoice_payment",
				invoiceCycle: { $in: cycles },
			},
		},
		{
			$group: {
				_id: "$invoiceCycle",
				paidInCents: { $sum: "$valueInCents" },
				paymentCount: { $sum: 1 },
				lastPaymentDate: { $max: "$date" },
			},
		},
	]);

	return new Map(rows.map((row) => [row._id, row]));
}

/**
 * Lista as faturas mais recentes de um cartão.
 *
 * @param {object} card - Documento do BankCard, com closingDay e dueDay.
 * @param {number} count - Quantos ciclos trazer, do mais novo para o mais antigo.
 */
async function listInvoices(userId, card, count = 6) {
	const ranges = recentCycles(card, count);
	const cycles = ranges.map((range) => range.cycle);

	const [purchases, payments] = await Promise.all([
		sumPurchasesByCycle(userId, card._id, ranges),
		sumPaymentsByCycle(userId, card._id, cycles),
	]);

	return ranges.map((range) => {
		const purchase = purchases.get(range.cycle) ?? { totalInCents: 0, transactionCount: 0 };
		const payment = payments.get(range.cycle);

		const invoice = {
			cycle: range.cycle,
			label: cycleLabel(range.cycle),
			closingDate: range.closingDate,
			dueDate: range.dueDate,
			periodStart: range.start,
			periodEnd: range.end,
			totalInCents: purchase.totalInCents,
			paidInCents: payment?.paidInCents ?? 0,
			transactionCount: purchase.transactionCount,
			paymentCount: payment?.paymentCount ?? 0,
			lastPaymentDate: payment?.lastPaymentDate ?? null,
		};

		invoice.remainingInCents = Math.max(0, invoice.totalInCents - invoice.paidInCents);
		invoice.status = resolveStatus(invoice);

		return invoice;
	});
}

/**
 * Detalhe de uma fatura: as compras agrupadas por categoria, mais a lista.
 *
 * O agrupamento por categoria é o que diferencia esta tela de um filtro na
 * lista de transações — responde "do que é feita a minha fatura?".
 */
async function getInvoiceDetail(userId, card, cycle) {
	const range = cycleRange(cycle, card);
	if (!range) return null;

	const purchaseMatch = {
		user: toObjectId(userId),
		bankCard: toObjectId(card._id),
		type: "credit",
		date: { $gte: range.start, $lte: range.end },
	};

	const [byCategory, transactions, payments] = await Promise.all([
		Transaction.aggregate([
			{ $match: purchaseMatch },
			{
				$group: {
					_id: "$category",
					totalInCents: { $sum: "$valueInCents" },
					count: { $sum: 1 },
				},
			},
			{
				$lookup: {
					from: "categories",
					localField: "_id",
					foreignField: "_id",
					as: "category",
				},
			},
			{ $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
			{
				$project: {
					_id: 0,
					categoryId: "$_id",
					category: { $ifNull: ["$category.name", "Sem categoria"] },
					color: { $ifNull: ["$category.color", "#94a3b8"] },
					totalInCents: 1,
					count: 1,
				},
			},
			{ $sort: { totalInCents: -1 } },
		]),

		Transaction.find(purchaseMatch)
			.populate("category", "name color")
			.sort({ date: -1 })
			.lean(),

		Transaction.find({
			user: toObjectId(userId),
			bankCard: toObjectId(card._id),
			type: "invoice_payment",
			invoiceCycle: cycle,
		})
			.sort({ date: 1 })
			.lean(),
	]);

	const totalInCents = transactions.reduce((sum, t) => sum + t.valueInCents, 0);
	const paidInCents = payments.reduce((sum, p) => sum + p.valueInCents, 0);

	const invoice = {
		cycle,
		label: cycleLabel(cycle),
		closingDate: range.closingDate,
		dueDate: range.dueDate,
		periodStart: range.start,
		periodEnd: range.end,
		totalInCents,
		paidInCents,
		remainingInCents: Math.max(0, totalInCents - paidInCents),
		transactionCount: transactions.length,
		categories: byCategory,
		transactions,
		payments,
	};

	invoice.status = resolveStatus(invoice);

	return invoice;
}

module.exports = { listInvoices, getInvoiceDetail, resolveStatus };
