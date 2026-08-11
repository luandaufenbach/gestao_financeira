const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

const UserSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Nome é obrigatório"],
			trim: true,
			maxlength: 120,
		},
		email: {
			type: String,
			required: [true, "E-mail é obrigatório"],
			unique: true,
			trim: true,
			lowercase: true,
			maxlength: 254,
		},
		passwordHash: {
			type: String,
			required: true,
			// Nunca retorna o hash em consultas, a menos que pedido explicitamente
			// com .select("+passwordHash"). Protege contra vazamento acidental
			// em qualquer res.json(user).
			select: false,
		},
	},
	{ timestamps: true }
);

/**
 * Define a senha do usuário já aplicando o hash.
 * Concentrar o hashing aqui garante que nenhum controller grave senha em claro.
 */
UserSchema.methods.setPassword = async function setPassword(plainPassword) {
	this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/** Compara uma senha em claro com o hash armazenado. */
UserSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
	if (!this.passwordHash) return Promise.resolve(false);
	return bcrypt.compare(plainPassword, this.passwordHash);
};

/** Representação segura para enviar ao cliente. */
UserSchema.methods.toPublicJSON = function toPublicJSON() {
	return {
		id: this._id,
		name: this.name,
		email: this.email,
		createdAt: this.createdAt,
	};
};

module.exports = mongoose.model("User", UserSchema);
