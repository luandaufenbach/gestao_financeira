const express = require("express");
const { getMonthlyBalance, getCreditCardInvoice, getSavedMoney, getTotalSavedMoney, getCategoryBreakdown } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/monthly-balance", getMonthlyBalance);
router.get("/credit-card-invoice", getCreditCardInvoice);
router.get("/saved-money", getSavedMoney);
router.get("/saved-money-total", getTotalSavedMoney);
router.get("/category-breakdown", getCategoryBreakdown);

module.exports = router;
