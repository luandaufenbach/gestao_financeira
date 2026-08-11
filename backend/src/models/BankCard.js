const mongoose = require("mongoose");

const CARD_TYPES = ["credit", "debit"];

const BankCardSchema = new mongoose.Schema(
	{
		// MUDANÇA (C5): escopo por usuário.
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		name: {
			type: String,
			required: [true, "Nome do cartão é obrigatório"],
			trim: true,
			maxlength: 60,
		},
		/**
		 * Apenas os 4 últimos dígitos, sempre.
		 *
		 * A validação anterior era `String(lastFourDigits).length > 4`, que aceitava
		 * 1, 2 ou 3 dígitos e também qualquer caractere não numérico. O regex abaixo
		 * exige exatamente 4 dígitos.
		 *
		 * Nota de segurança: guardar o PAN completo exigiria conformidade PCI-DSS.
		 * Os 4 últimos dígitos são explicitamente permitidos para exibição.
		 */
		lastFourDigits: {
			type: String,
			required: [true, "Os 4 últimos dígitos são obrigatórios"],
			match: [/^\d{4}$/, "Informe exatamente os 4 últimos dígitos"],
		},
		type: {
			type: String,
			enum: { values: CARD_TYPES, message: "Tipo deve ser credit ou debit" },
			required: true,
		},
		// MUDANÇA (C7): limite em centavos.
		limitInCents: {
			type: Number,
			default: 0,
			min: [0, "Limite não pode ser negativo"],
			validate: {
				validator: Number.isInteger,
				message: "Limite deve ser um inteiro em centavos",
			},
		},
		color: {
			type: String,
			default: "#1e293b",
			match: [/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)"],
		},
		bank: {
			type: String,
			trim: true,
			maxlength: 60,
			default: "",
		},
	},
	{ timestamps: true }
);

// Listagem dos cartões do usuário (A4).
BankCardSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("BankCard", BankCardSchema);
module.exports.CARD_TYPES = CARD_TYPES;
