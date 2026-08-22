import { http } from "./http";

/**
 * Camada de acesso à API.
 *
 * Todos os valores monetários trafegam em CENTAVOS (inteiros) — ver
 * backend/src/utils/money.js e src/services/useFormatters.js.
 */

// ── Auth ──────────────────────────────────────────────────────
export const register = (payload) => http.post("/auth/register", payload, { auth: false });
export const login = (payload) => http.post("/auth/login", payload, { auth: false });
export const getMe = () => http.get("/auth/me");

// ── Dashboard ─────────────────────────────────────────────────
export const getMonthlyBalance = (year, month) =>
	http.get("/dashboard/monthly-balance", { params: { year, month } });

export const getTotalSavedMoney = () => http.get("/dashboard/saved-money-total");

export const getCategoryBreakdown = (year, month) =>
	http.get("/dashboard/category-breakdown", { params: { year, month } });

// ── Transactions ──────────────────────────────────────────────
export const getTransactions = (params = {}) => http.get("/transactions", { params });

export const createTransaction = (transaction) => http.post("/transactions", transaction);

export const updateTransaction = (id, transaction) =>
	http.patch(`/transactions/${id}`, transaction);

/**
 * @param {string} id
 * @param {"single"|"group"} scope - "group" apaga todas as parcelas da compra.
 *   O padrão é "single", o comportamento menos destrutivo (ver bug C3).
 */
export const deleteTransaction = (id, scope = "single") =>
	http.delete(`/transactions/${id}`, { params: { scope } });

// ── Goals ─────────────────────────────────────────────────────
export const getGoals = () => http.get("/goals");
export const createGoal = (goal) => http.post("/goals", goal);
export const updateGoal = (id, goal) => http.patch(`/goals/${id}`, goal);
export const deleteGoal = (id) => http.delete(`/goals/${id}`);

// ── Bank Cards ────────────────────────────────────────────────
export const getBankCards = () => http.get("/bank-cards");
export const createBankCard = (card) => http.post("/bank-cards", card);
export const deleteBankCard = (id) => http.delete(`/bank-cards/${id}`);

// ── Faturas ───────────────────────────────────────────────────
/** Faturas recentes de um cartão, da mais nova para a mais antiga. */
export const getCardInvoices = (cardId, limit = 6) =>
	http.get(`/bank-cards/${cardId}/invoices`, { params: { limit } });

/** @param {string} cycle - Ciclo no formato "2026-08" (ano-mês do vencimento). */
export const getCardInvoice = (cardId, cycle) =>
	http.get(`/bank-cards/${cardId}/invoices/${cycle}`);

// ── Categories ────────────────────────────────────────────────
export const getCategories = () => http.get("/categories");
export const createCategory = (category) => http.post("/categories", category);
export const deleteCategory = (id) => http.delete(`/categories/${id}`);
