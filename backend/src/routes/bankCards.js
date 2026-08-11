const express = require("express");

const {
	listBankCards,
	createBankCard,
	updateBankCard,
	deleteBankCard,
} = require("../controllers/bankCardController");
const { createBankCardSchema, updateBankCardSchema } = require("../validators/resourceValidators");
const { idParam } = require("../validators/common");
const validate = require("../middlewares/validate");

const router = express.Router();

router.get("/", listBankCards);
router.post("/", validate({ body: createBankCardSchema }), createBankCard);
router.patch("/:id", validate({ params: idParam, body: updateBankCardSchema }), updateBankCard);
router.delete("/:id", validate({ params: idParam }), deleteBankCard);

module.exports = router;
