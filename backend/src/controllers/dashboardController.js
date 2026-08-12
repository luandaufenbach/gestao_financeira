const mongoose = require("mongoose");

const Transaction = require("../models/Transaction");
const asyncHandler = require("../utils/asyncHandler");
const { getMonthRangeUTC } = require("../utils/date");

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * CONTROLLER REESCRITO — motivo (A3):
 *
 * A versão anterior carregava TODOS os documentos do mês para a memória do
 * Node e somava com forEach/reduce em JavaScript. Isso significa trafegar a
 * coleção inteira pela rede a cada carregamento do dashboard, e o custo cresce
 * linearmente com o histórico do usuário.
 *
 * Agora tudo é feito com aggregation pipeline: o MongoDB soma no servidor,
 * usando os índices, e devolve apenas o número final. Além de bem mais rápido,
 * o uso de memória passa a ser constante.
 *
 * Bônus: o getCategoryBreakdown antigo fazia um Category.findOne() POR
 * categoria (N+1). Aqui um único $lookup resolve.
 */

/** Filtro base: sempre escopado ao usuário e ao intervalo UTC do mês (C2, C5). */
const monthMatch = (userId, query) => {
	const { start, end } = getMonthRangeUTC(query.year, query.month);
	return { user: toObjectId(userId), date: { $gte: start, $lte: end } };
};

/**
 * Resumo do mês, em duas visões que respondem perguntas diferentes.
 *
 * CAIXA — `balanceInCents`, "quanto ainda posso gastar":
 *   receitas − despesas no débito − guardado + resgatado − pagamento de fatura
 *
 *   Compra no crédito NÃO entra aqui. No dia da compra o dinheiro continua na
 *   sua conta; o que você contraiu foi uma dívida. Ele só sai quando a fatura é
 *   paga. Contar os dois momentos somaria o mesmo gasto duas vezes — em julho
 *   pela compra e em agosto pelo pagamento.
 *
 * COMPETÊNCIA — `netResultInCents`, "vivi dentro do que ganho?":
 *   receitas − (débito + crédito)
 *
 *   Aqui a compra no crédito conta integralmente, no mês em que foi feita, e o
 *   pagamento da fatura não conta — ele só quita uma dívida já registrada.
 *
 * As transferências (guardar, resgatar, pagar fatura) nunca entram na
 * competência: não alteram patrimônio, só movem dinheiro de bolso.
 */
const getMonthlyBalance = asyncHandler(async (req, res) => {
	const match = monthMatch(req.userId, req.validatedQuery);

	const sumIf = (condition) => ({
		$sum: { $cond: [condition, "$valueInCents", 0] },
	});

	const [result] = await Transaction.aggregate([
		{ $match: match },
		{
			$group: {
				_id: null,
				incomeInCents: sumIf({ $eq: ["$type", "income"] }),
				debitExpenseInCents: sumIf({ $eq: ["$type", "debit"] }),
				creditExpenseInCents: sumIf({ $eq: ["$type", "credit"] }),
				savedInCents: sumIf({ $eq: ["$type", "savings"] }),
				withdrawnInCents: sumIf({ $eq: ["$type", "withdrawal"] }),
				invoicePaidInCents: sumIf({ $eq: ["$type", "invoice_payment"] }),
			},
		},
	]);

	const incomeInCents = result?.incomeInCents ?? 0;
	const debitExpenseInCents = result?.debitExpenseInCents ?? 0;
	const creditExpenseInCents = result?.creditExpenseInCents ?? 0;
	const savedInCents = result?.savedInCents ?? 0;
	const withdrawnInCents = result?.withdrawnInCents ?? 0;
	const invoicePaidInCents = result?.invoicePaidInCents ?? 0;

	// Total gasto no mês, para as categorias e o gráfico (visão de competência).
	const expenseInCents = debitExpenseInCents + creditExpenseInCents;

	return res.json({
		balanceInCents:
			incomeInCents -
			debitExpenseInCents -
			savedInCents +
			withdrawnInCents -
			invoicePaidInCents,
		netResultInCents: incomeInCents - expenseInCents,

		incomeInCents,
		expenseInCents,
		debitExpenseInCents,
		creditExpenseInCents,
		savedInCents,
		withdrawnInCents,
		invoicePaidInCents,

		// Quanto a reserva variou no mês: positivo guardou, negativo resgatou.
		netSavedInCents: savedInCents - withdrawnInCents,
	});
});

/**
 * REMOVIDO: `GET /dashboard/credit-card-invoice`.
 *
 * Somava as compras no crédito do MÊS DO CALENDÁRIO e chamava aquilo de
 * "fatura". Nunca batia com a cobrança do banco, porque a fatura real segue o
 * ciclo de fechamento do cartão — uma compra do dia 30 costuma cair na fatura
 * do mês seguinte, não na do mês em que foi feita.
 *
 * Substituído por `GET /bank-cards/:id/invoices`, que monta as faturas por
 * ciclo e ainda traz status e composição. Ver services/invoiceService.js.
 */

/**
 * Soma líquida da reserva: guardado menos resgatado.
 *
 * O `$cond` inverte o sinal do resgate dentro da própria agregação, então o
 * resultado é a VARIAÇÃO da reserva no período — e não mais um contador que só
 * cresce, como era antes de existir o resgate.
 */
async function sumNetSavings(match) {
	const [result] = await Transaction.aggregate([
		{ $match: { ...match, type: { $in: ["savings", "withdrawal"] } } },
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

/** Quanto a reserva variou no mês selecionado. */
const getSavedMoney = asyncHandler(async (req, res) => {
	const match = monthMatch(req.userId, req.validatedQuery);

	return res.json({ savedInCents: await sumNetSavings(match) });
});

/**
 * Saldo acumulado da reserva, de todo o histórico.
 *
 * Este é o número que o card "Valor guardado total" exibe. Antes ele somava
 * apenas os `savings` e portanto nunca diminuía: quem guardasse R$ 500/mês por
 * um ano e usasse R$ 3.000 numa viagem continuaria vendo R$ 6.000. Agora reflete
 * o que de fato está guardado.
 */
const getTotalSavedMoney = asyncHandler(async (req, res) => {
	const match = { user: toObjectId(req.userId) };

	return res.json({ savedInCents: await sumNetSavings(match) });
});

/**
 * Gastos por categoria no mês.
 *
 * O $lookup traz nome e cor da categoria em uma única viagem, substituindo o
 * N+1 anterior (um findOne por categoria dentro de um Promise.all).
 */
const getCategoryBreakdown = asyncHandler(async (req, res) => {
	const match = {
		...monthMatch(req.userId, req.validatedQuery),
		type: { $in: ["debit", "credit"] },
	};

	const breakdown = await Transaction.aggregate([
		{ $match: match },
		{ $group: { _id: "$category", totalInCents: { $sum: "$valueInCents" } } },
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
				// Despesas sem categoria (receitas convertidas, dados antigos)
				// caem em "Sem categoria" em vez de sumirem do gráfico.
				category: { $ifNull: ["$category.name", "Sem categoria"] },
				color: { $ifNull: ["$category.color", "#94a3b8"] },
				totalInCents: 1,
			},
		},
		{ $sort: { totalInCents: -1 } },
	]);

	return res.json(breakdown);
});

module.exports = {
	getMonthlyBalance,
	getSavedMoney,
	getTotalSavedMoney,
	getCategoryBreakdown,
};
