const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema(
	{
		// MUDANÇA (C5): escopo por usuário.
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		name: {
			type: String,
			required: [true, "Nome da meta é obrigatório"],
			trim: true,
			maxlength: 120,
		},
		// MUDANÇA (C7): valores em centavos, como inteiros.
		targetAmountInCents: {
			type: Number,
			default: 0,
			min: [0, "Valor alvo não pode ser negativo"],
			validate: {
				validator: Number.isInteger,
				message: "Valor alvo deve ser um inteiro em centavos",
			},
		},
		currentAmountInCents: {
			type: Number,
			default: 0,
			min: [0, "Valor atual não pode ser negativo"],
			validate: {
				validator: Number.isInteger,
				message: "Valor atual deve ser um inteiro em centavos",
			},
		},
		color: {
			type: String,
			default: "#22c55e",
			match: [/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)"],
		},
		deadline: {
			type: Date,
			default: null,
		},
		description: {
			type: String,
			trim: true,
			maxlength: 500,
			default: "",
		},
	},
	{ timestamps: true }
);

// Listagem das metas do usuário, mais recentes primeiro (A4).
GoalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Goal", GoalSchema);
