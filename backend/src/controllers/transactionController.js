const Transaction = require("../models/Transaction");

const listTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1, createdAt: -1 });
        return res.json(transactions);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao listar transações" });
    }
};

const createTransaction = async (req, res) => {
    try {
        const { type, description, value, date, installment } = req.body;

        const validTypes = ["debit", "credit", "income", "savings"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: "O campo 'type' deve ser 'debit', 'credit', 'income' ou 'savings'" });
        }

        if (!description || typeof description !== "string" || !description.trim()) {
            return res.status(400).json({ message: "O campo 'description' é obrigatório" });
        }

        if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
            return res.status(400).json({ message: "O campo 'value' deve ser um número >= 0" });
        }

        if (!date) {
            return res.status(400).json({ message: "O campo 'date' é obrigatório" });
        }

        const created = await Transaction.create({
            type,
            description: description.trim(),
            value,
            date,
            installment,
        });

        return res.status(201).json(created);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao criar transação" });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Transaction.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Transação não encontrada" });
        }

        return res.json({ message: "Transação removida" });
    } catch (error) {
        return res.status(400).json({ message: "Id inválido" });
    }
};


module.exports = {
    listTransactions,
    createTransaction,
    deleteTransaction,
};
