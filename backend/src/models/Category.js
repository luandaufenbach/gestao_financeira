const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
	{
		// MUDANÇA (C5): toda categoria pertence a um usuário.
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		name: {
			type: String,
			required: [true, "Nome da categoria é obrigatório"],
			trim: true,
			maxlength: 60,
		},
		color: {
			type: String,
			default: "#64748b",
			match: [/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)"],
		},
		icon: {
			type: String,
			default: "tag",
			trim: true,
			maxlength: 40,
		},
	},
	{ timestamps: true }
);

/**
 * Unicidade do nome POR USUÁRIO e case-insensitive.
 *
 * BUG CORRIGIDO (M10): o índice anterior era `unique: true` global e
 * case-sensitive. Isso permitia "mercado" e "Mercado" coexistirem, enquanto o
 * lookup nas transações era case-insensitive — o match ficava ambíguo. Pior:
 * sendo global, o nome de categoria de um usuário bloqueava o de outro.
 *
 * A collation com strength 2 faz o índice ignorar maiúsculas/minúsculas.
 */
CategorySchema.index(
	{ user: 1, name: 1 },
	{ unique: true, collation: { locale: "pt", strength: 2 } }
);

module.exports = mongoose.model("Category", CategorySchema);
