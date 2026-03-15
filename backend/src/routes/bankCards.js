const express = require("express");
const { listBankCards, createBankCard, deleteBankCard } = require("../controllers/bankCardController");

const router = express.Router();

router.get("/", listBankCards);
router.post("/", createBankCard);
router.delete("/:id", deleteBankCard);

module.exports = router;
