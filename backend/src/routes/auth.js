const express = require("express");
const rateLimit = require("express-rate-limit");

const { register, login, me } = require("../controllers/authController");
const { registerSchema, loginSchema } = require("../validators/authValidators");
const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/auth");
const { isTest } = require("../config/env");

const router = express.Router();

/**
 * Rate limit específico para as rotas de credenciais.
 *
 * MOTIVO: sem isso, /auth/login aceita força bruta ilimitada e /auth/register
 * permite criar contas em massa. O limite global do app.js é bem mais alto e
 * não serviria aqui.
 *
 * Desativado nos testes para não interferir nas asserções.
 */
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10,
	message: { message: "Muitas tentativas. Tente novamente em alguns minutos." },
	standardHeaders: true,
	legacyHeaders: false,
	skip: () => isTest,
});

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.get("/me", authenticate, me);

module.exports = router;
