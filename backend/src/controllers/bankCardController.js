const BankCard = require("../models/BankCard");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { listInvoices, getInvoiceDetail } = require("../services/invoiceService");

const listBankCards = asyncHandler(async (req, res) => {
	const cards = await BankCard.find({ user: req.userId }).sort({ createdAt: -1 }).lean();

	return res.json(cards);
});

const createBankCard = asyncHandler(async (req, res) => {
	const created = await BankCard.create({ ...req.body, user: req.userId });

	return res.status(201).json(created);
});

const updateBankCard = asyncHandler(async (req, res) => {
	const updated = await BankCard.findOneAndUpdate(
		{ _id: req.params.id, user: req.userId },
		req.body,
		{ returnDocument: "after", runValidators: true }
	);

	if (!updated) {
		throw AppError.notFound("Cartão não encontrado");
	}

	return res.json(updated);
});

const deleteBankCard = asyncHandler(async (req, res) => {
	const card = await BankCard.findOne({ _id: req.params.id, user: req.userId });

	if (!card) {
		throw AppError.notFound("Cartão não encontrado");
	}

	/**
	 * Ao contrário da categoria, o cartão é opcional na transação. Excluir o
	 * cartão não deve impedir nada nem apagar histórico: apenas desvincula.
	 * O gasto continua registrado, só deixa de apontar para um cartão.
	 */
	await Transaction.updateMany(
		{ user: req.userId, bankCard: card._id },
		{ $set: { bankCard: null } }
	);

	await BankCard.deleteOne({ _id: card._id, user: req.userId });

	return res.json({ message: "Cartão removido" });
});

/** Carrega o cartão garantindo posse e ciclo de fatura configurado. */
async function loadCardWithCycle(cardId, userId) {
	const card = await BankCard.findOne({ _id: cardId, user: userId });

	if (!card) {
		throw AppError.notFound("Cartão não encontrado");
	}
	if (!card.hasInvoiceCycle()) {
		throw AppError.badRequest(
			"Configure o dia de fechamento e o de vencimento do cartão para ver as faturas."
		);
	}

	return card;
}

const listInvoicesForCard = asyncHandler(async (req, res) => {
	const card = await loadCardWithCycle(req.params.id, req.userId);
	const { limit } = req.validatedQuery;

	const invoices = await listInvoices(req.userId, card, limit ?? 6);

	return res.json({
		card: {
			_id: card._id,
			name: card.name,
			bank: card.bank,
			color: card.color,
			lastFourDigits: card.lastFourDigits,
			closingDay: card.closingDay,
			dueDay: card.dueDay,
		},
		invoices,
	});
});

const getInvoice = asyncHandler(async (req, res) => {
	const card = await loadCardWithCycle(req.params.id, req.userId);

	const invoice = await getInvoiceDetail(req.userId, card, req.params.cycle);

	if (!invoice) {
		throw AppError.badRequest("Ciclo inválido. Use o formato AAAA-MM.");
	}

	return res.json(invoice);
});

module.exports = {
	listBankCards,
	createBankCard,
	updateBankCard,
	deleteBankCard,
	listInvoicesForCard,
	getInvoice,
};
