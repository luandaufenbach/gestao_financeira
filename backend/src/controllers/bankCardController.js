const BankCard = require("../models/BankCard");

const listBankCards = async (req, res) => {
    try {
        const cards = await BankCard.find().sort({ createdAt: -1 });
        return res.json(cards);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao listar cartões" });
    }
};

const createBankCard = async (req, res) => {
    try {
        const { name, lastFourDigits, type, limit, color, bank } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "O campo 'name' é obrigatório" });
        }
        if (!lastFourDigits || String(lastFourDigits).length > 4) {
            return res.status(400).json({ message: "Últimos 4 dígitos inválidos" });
        }
        if (!["credit", "debit"].includes(type)) {
            return res.status(400).json({ message: "Tipo deve ser 'credit' ou 'debit'" });
        }

        const card = await BankCard.create({
            name: name.trim(),
            lastFourDigits: String(lastFourDigits),
            type,
            limit: limit ?? 0,
            color,
            bank,
        });

        return res.status(201).json(card);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao criar cartão" });
    }
};

const deleteBankCard = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await BankCard.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Cartão não encontrado" });
        }

        return res.json({ message: "Cartão removido" });
    } catch (error) {
        return res.status(400).json({ message: "Id inválido" });
    }
};

module.exports = { listBankCards, createBankCard, deleteBankCard };
