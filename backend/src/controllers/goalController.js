const Goal = require("../models/Goal");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const listGoals = asyncHandler(async (req, res) => {
	const goals = await Goal.find({ user: req.userId }).sort({ createdAt: -1 }).lean();

	return res.json(goals);
});

const createGoal = asyncHandler(async (req, res) => {
	const created = await Goal.create({ ...req.body, user: req.userId });

	return res.status(201).json(created);
});

const updateGoal = asyncHandler(async (req, res) => {
	/**
	 * BUG CORRIGIDO (A2 — mass assignment): a versão anterior era
	 *   Goal.findByIdAndUpdate(id, req.body)
	 * repassando o corpo inteiro da requisição direto ao banco, sem allowlist e
	 * sem verificar o dono do documento.
	 *
	 * Agora req.body já passou pelo schema Zod com .strict(), que rejeita
	 * qualquer campo não declarado, e o filtro inclui o usuário autenticado.
	 */
	const updated = await Goal.findOneAndUpdate(
		{ _id: req.params.id, user: req.userId },
		req.body,
		{
			returnDocument: "after",
			runValidators: true,
		}
	);

	if (!updated) {
		throw AppError.notFound("Meta não encontrada");
	}

	return res.json(updated);
});

const deleteGoal = asyncHandler(async (req, res) => {
	const deleted = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });

	if (!deleted) {
		throw AppError.notFound("Meta não encontrada");
	}

	/**
	 * Mesma regra do cartão: excluir a meta não apaga histórico, só desvincula.
	 * O dinheiro nunca esteve "dentro" da meta — ele está na reserva, e a meta
	 * apenas dizia para onde ia. O total guardado do dashboard não se mexe.
	 */
	await Transaction.updateMany({ user: req.userId, goal: deleted._id }, { $set: { goal: null } });

	return res.json({ message: "Meta removida" });
});

module.exports = { listGoals, createGoal, updateGoal, deleteGoal };
