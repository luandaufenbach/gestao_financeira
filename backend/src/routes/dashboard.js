const express = require("express");

const {
	getMonthlyBalance,
	getSavedMoney,
	getTotalSavedMoney,
	getCategoryBreakdown,
} = require("../controllers/dashboardController");
const { monthQuery } = require("../validators/common");
const validate = require("../middlewares/validate");

const router = express.Router();

// Todas as rotas do dashboard aceitam ?year=&month= e caem no mês atual (UTC)
// quando os parâmetros são omitidos.
const withMonth = validate({ query: monthQuery });

router.get("/monthly-balance", withMonth, getMonthlyBalance);
router.get("/saved-money", withMonth, getSavedMoney);
router.get("/saved-money-total", withMonth, getTotalSavedMoney);
router.get("/category-breakdown", withMonth, getCategoryBreakdown);

module.exports = router;
