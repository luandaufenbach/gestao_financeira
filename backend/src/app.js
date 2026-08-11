const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { corsOrigins, isTest } = require("./config/env");
const authenticate = require("./middlewares/auth");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./routes/auth");
const categoriesRoutes = require("./routes/categories");
const transactionsRoutes = require("./routes/transactions");
const dashboardRoutes = require("./routes/dashboard");
const goalsRoutes = require("./routes/goals");
const bankCardsRoutes = require("./routes/bankCards");

const app = express();

// Necessário para o rate limiter identificar o IP real atrás de um proxy
// (Render, Railway, nginx). Confia apenas no primeiro salto.
app.set("trust proxy", 1);

// Cabeçalhos de segurança (CSP, X-Frame-Options, HSTS...). A API não serve
// HTML, então a CSP padrão do helmet não atrapalha nada.
app.use(helmet());

/**
 * CORS restrito a uma allowlist.
 *
 * MOTIVO (C5): antes era `app.use(cors())`, que libera QUALQUER origem. Somado
 * à ausência de autenticação, isso permitia que qualquer site aberto no
 * navegador do usuário lesse e apagasse os dados dele.
 *
 * As origens permitidas vêm de CORS_ORIGINS no .env.
 */
app.use(
	cors({
		origin(origin, callback) {
			// Requisições sem Origin (curl, apps mobile, health checks) passam.
			if (!origin) return callback(null, true);
			if (corsOrigins.includes(origin)) return callback(null, true);

			/**
			 * Origem não permitida: respondemos SEM os cabeçalhos de CORS, em vez
			 * de lançar um erro.
			 *
			 * Lançar aqui fazia o middleware de erro devolver 500 e registrar um
			 * stack trace a cada requisição de origem desconhecida — ou seja, um
			 * cliente qualquer conseguia poluir o log do servidor. O navegador já
			 * bloqueia a resposta pela ausência dos cabeçalhos, que é exatamente
			 * o comportamento desejado.
			 */
			return callback(null, false);
		},
		credentials: true,
	})
);

// Limite explícito de tamanho do corpo, para não depender do padrão implícito.
app.use(express.json({ limit: "100kb" }));

// Limite global de requisições, uma rede de proteção contra abuso automatizado.
// As rotas de credenciais têm um limite bem mais apertado (ver routes/auth.js).
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 1000,
		standardHeaders: true,
		legacyHeaders: false,
		skip: () => isTest,
	})
);

// Health check público, útil para monitoramento e deploy.
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/auth", authRoutes);

/**
 * A partir daqui, tudo exige autenticação.
 *
 * Aplicar o middleware no nível do app (e não rota a rota) garante que
 * nenhum endpoint novo nasça acidentalmente desprotegido — é seguro por padrão.
 */
app.use("/categories", authenticate, categoriesRoutes);
app.use("/transactions", authenticate, transactionsRoutes);
app.use("/dashboard", authenticate, dashboardRoutes);
app.use("/goals", authenticate, goalsRoutes);
app.use("/bank-cards", authenticate, bankCardsRoutes);

// Precisam vir por último, nesta ordem.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
