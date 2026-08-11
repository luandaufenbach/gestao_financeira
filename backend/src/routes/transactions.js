const express = require("express");

const {
	listTransactions,
	createTransaction,
	updateTransaction,
	deleteTransaction,
} = require("../controllers/transactionController");
const {
	createTransactionSchema,
	updateTransactionSchema,
	listTransactionsQuery,
	deleteTransactionQuery,
} = require("../validators/transactionValidators");
const { idParam } = require("../validators/common");
const validate = require("../middlewares/validate");

const router = express.Router();

router.get("/", validate({ query: listTransactionsQuery }), listTransactions);
router.post("/", validate({ body: createTransactionSchema }), createTransaction);
router.patch(
	"/:id",
	validate({ params: idParam, body: updateTransactionSchema }),
	updateTransaction
);
router.delete(
	"/:id",
	validate({ params: idParam, query: deleteTransactionQuery }),
	deleteTransaction
);

module.exports = router;
