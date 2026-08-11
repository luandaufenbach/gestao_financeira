const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const listCategories = asyncHandler(async (req, res) => {
	const categories = await Category.find({ user: req.userId })
		.sort({ name: 1 })
		.collation({ locale: "pt", strength: 2 })
		.lean();

	return res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
	const created = await Category.create({ ...req.body, user: req.userId });

	return res.status(201).json(created);
});

const updateCategory = asyncHandler(async (req, res) => {
	// Só os campos declarados no schema Zod chegam aqui — sem mass assignment (A2).
	const updated = await Category.findOneAndUpdate(
		{ _id: req.params.id, user: req.userId },
		req.body,
		{ returnDocument: "after", runValidators: true }
	);

	if (!updated) {
		throw AppError.notFound("Categoria não encontrada");
	}

	return res.json(updated);
});

const deleteCategory = asyncHandler(async (req, res) => {
	const category = await Category.findOne({ _id: req.params.id, user: req.userId });

	if (!category) {
		throw AppError.notFound("Categoria não encontrada");
	}

	/**
	 * BUG CORRIGIDO (A7): antes a categoria era apagada sem verificar nada, e
	 * como `Transaction.category` era só uma string com o nome, as transações
	 * ficavam apontando para uma categoria inexistente. O gráfico perdia a cor
	 * e — pior — editar aquela transação passava a falhar com "Categoria não
	 * existe", sem que o usuário tivesse como consertar.
	 *
	 * Agora a exclusão de uma categoria em uso é bloqueada, com a contagem para
	 * o usuário saber o tamanho do impacto antes de decidir.
	 */
	const inUse = await Transaction.countDocuments({
		user: req.userId,
		category: category._id,
	});

	if (inUse > 0) {
		throw AppError.conflict(
			`Esta categoria está sendo usada por ${inUse} ${
				inUse === 1 ? "transação" : "transações"
			}. Altere ou remova essas transações antes de excluí-la.`
		);
	}

	await Category.deleteOne({ _id: category._id, user: req.userId });

	return res.json({ message: "Categoria removida" });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
