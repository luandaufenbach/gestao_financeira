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

/** Soma valueInCents dos documentos que casam com o filtro. Retorna 0 se vazio. */
async function sumCents(match) {
	const [result] = await Transaction.aggregate([
		{ $match: match },
		{ $group: { _id: null, total: { $sum: "$valueInCents" } } },
	]);

	return result?.total ?? 0;
}

/**
 * Saldo do mês: receitas − despesas − guardado + resgatado.
 *
 * DECISÃO DE PRODUTO: "saldo" aqui significa DINHEIRO DISPONÍVEL, não resultado
 * contábil do mês. Recebi 500 e guardei 200 -> saldo 300, porque os 200 saíram
 * da conta corrente e não estão mais disponíveis para gastar.
 *
 * O resgate é o caminho inverso: o dinheiro volta da reserva para a conta, então
 * SOMA no disponível. Nenhum dos dois é receita ou despesa — por isso ficam de
 * fora do `netResultInCents`, que responde "vivi dentro do que ganho?".
 *
 * Uma única passada com $group condicional, em vez de quatro consultas.
 */
const getMonthlyBalance = asyncHandler(async (req, res) => {
	const match = monthMatch(req.userId, req.validatedQuery);

	const [result] = await Transaction.aggregate([
		{ $match: match },
		{
			$group: {
				_id: null,
				incomeInCents: {
					$sum: { $cond: [{ $eq: ["$type", "income"] }, "$valueInCents", 0] },
				},
				expenseInCents: {
					$sum: {
						$cond: [{ $in: ["$type", ["debit", "credit"]] }, "$valueInCents", 0],
					},
				},
				savedInCents: {
					$sum: { $cond: [{ $eq: ["$type", "savings"] }, "$valueInCents", 0] },
				},
				withdrawnInCents: {
					$sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$valueInCents", 0] },
				},
			},
		},
	]);

	const incomeInCents = result?.incomeInCents ?? 0;
	const expenseInCents = result?.expenseInCents ?? 0;
	const savedInCents = result?.savedInCents ?? 0;
	const withdrawnInCents = result?.withdrawnInCents ?? 0;

	return res.json({
		// Disponível: sobrou depois de gastar e guardar, mais o que voltou da reserva.
		balanceInCents: incomeInCents - expenseInCents - savedInCents + withdrawnInCents,
		// Resultado do mês, ignorando as transferências de/para a reserva.
		netResultInCents: incomeInCents - expenseInCents,
		incomeInCents,
		expenseInCents,
		savedInCents,
		withdrawnInCents,
		// Quanto a reserva variou no mês: positivo guardou, negativo resgatou.
		netSavedInCents: savedInCents - withdrawnInCents,
	});
});

const getCreditCardInvoice = asyncHandler(async (req, res) => {
	const match = { ...monthMatch(req.userId, req.validatedQuery), type: "credit" };

	return res.json({ invoiceInCents: await sumCents(match) });
});

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
	getCreditCardInvoice,
	getSavedMoney,
	getTotalSavedMoney,
	getCategoryBreakdown,
};
