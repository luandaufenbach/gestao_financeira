const express = require("express");

const { z } = require("zod");

const {
	listBankCards,
	createBankCard,
	updateBankCard,
	deleteBankCard,
	listInvoicesForCard,
	getInvoice,
} = require("../controllers/bankCardController");
const { createBankCardSchema, updateBankCardSchema } = require("../validators/resourceValidators");
const { idParam, objectId, cycleKey } = require("../validators/common");
const validate = require("../middlewares/validate");

const router = express.Router();

router.get("/", listBankCards);
router.post("/", validate({ body: createBankCardSchema }), createBankCard);
router.patch("/:id", validate({ params: idParam, body: updateBankCardSchema }), updateBankCard);
router.delete("/:id", validate({ params: idParam }), deleteBankCard);

// ── Faturas ───────────────────────────────────────────────────
router.get(
	"/:id/invoices",
	validate({
		params: idParam,
		query: z.object({ limit: z.coerce.number().int().min(1).max(24).optional() }),
	}),
	listInvoicesForCard
);

router.get(
	"/:id/invoices/:cycle",
	validate({ params: z.object({ id: objectId, cycle: cycleKey }) }),
	getInvoice
);

module.exports = router;
