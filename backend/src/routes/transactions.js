const express = require("express");

const {
    listTransactions,
    createTransaction,
    deleteTransaction,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/", listTransactions);
router.post("/", createTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
