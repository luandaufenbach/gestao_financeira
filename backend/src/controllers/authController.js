const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Category = require("../models/Category");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

/** Categorias criadas automaticamente para um usuário novo. */
const DEFAULT_CATEGORIES = [
	{ name: "Mercado", color: "#22c55e", icon: "shopping-cart" },
	{ name: "Combustível", color: "#f59e0b", icon: "fuel" },
	{ name: "Lazer", color: "#8b5cf6", icon: "smile" },
	{ name: "Saúde", color: "#ef4444", icon: "heart" },
	{ name: "Moradia", color: "#0ea5e9", icon: "home" },
	{ name: "Outros", color: "#94a3b8", icon: "tag" },
];

const signToken = (userId) =>
	jwt.sign({ sub: String(userId) }, jwtSecret, { expiresIn: jwtExpiresIn });

/**
 * Hash descartável, com o mesmo custo (12 rounds) dos hashes reais.
 *
 * Serve para gastar o mesmo tempo de CPU quando o e-mail não existe. Sem isso,
 * um e-mail não cadastrado responderia em ~1ms e um cadastrado em ~100ms — a
 * diferença permitiria enumerar quais contas existem. Corresponde à string
 * "senha-que-nunca-sera-usada".
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.aQY1TIhrxKC/OGyKqGpMH0S/RhP0hbW";

const register = asyncHandler(async (req, res) => {
	const { name, email, password } = req.body;

	const existing = await User.findOne({ email });
	if (existing) {
		throw AppError.conflict("Já existe uma conta com esse e-mail");
	}

	const user = new User({ name, email });
	await user.setPassword(password);
	await user.save();

	// Um usuário sem categorias não consegue lançar despesas, já que categoria
	// é obrigatória para débito/crédito. Semear evita esse beco sem saída.
	await Category.insertMany(
		DEFAULT_CATEGORIES.map((category) => ({ ...category, user: user._id }))
	);

	return res.status(201).json({
		token: signToken(user._id),
		user: user.toPublicJSON(),
	});
});

const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	// O hash tem select:false no schema, então precisa ser pedido explicitamente.
	const user = await User.findOne({ email }).select("+passwordHash");

	// Mensagem idêntica para e-mail inexistente e senha errada: revelar qual
	// dos dois falhou permitiria enumerar contas cadastradas.
	const invalid = AppError.unauthorized("E-mail ou senha inválidos");

	if (!user) {
		// Gasta o mesmo tempo de CPU de uma comparação real para não vazar a
		// existência da conta pelo tempo de resposta.
		await bcrypt.compare(password, DUMMY_HASH);
		throw invalid;
	}

	const passwordMatches = await user.verifyPassword(password);
	if (!passwordMatches) {
		throw invalid;
	}

	return res.json({
		token: signToken(user._id),
		user: user.toPublicJSON(),
	});
});

const me = asyncHandler(async (req, res) => {
	const user = await User.findById(req.userId);
	if (!user) {
		throw AppError.unauthorized("Usuário não encontrado");
	}
	return res.json(user.toPublicJSON());
});

module.exports = { register, login, me, DEFAULT_CATEGORIES };
