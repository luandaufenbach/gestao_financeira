const express = require("express");

const {
    listTransactions,
    createTransaction,
    deleteTransaction,
    updateTransaction,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/", listTransactions);
router.post("/", createTransaction);
router.patch("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
