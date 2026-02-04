const express = require("express");
const { getMonthlyBalance, getCreditCardInvoice, getSavedMoney } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/monthly-balance", getMonthlyBalance);
router.get("/credit-card-invoice", getCreditCardInvoice);
router.get("/saved-money", getSavedMoney);

module.exports = router;
