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
        const { type, description, value, date, installment, category } = req.body;

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
            category,
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

const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, description, value, date, installment, category } = req.body;

        if (description && (!description.trim())) {
            return res.status(400).json({ message: "Descrição não pode estar vazia" });
        }
        if (value !== undefined && (typeof value !== "number" || value < 0)) {
            return res.status(400).json({ message: "Valor deve ser um número maior ou igual a 0" });
        }


        //atualiza so os campos enviados (patch)
        const updated = await Transaction.findByIdAndUpdate(
            id,
            { type, description, value, date, category, installment },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(400).json({ message: "Transação não encontrada" });
        }

        return res.json(updated);
    } catch (error) {
        return res.status(400).json({ message: "Erro ao atualizar transação" })
    }
};


module.exports = {
    listTransactions,
    createTransaction,
    deleteTransaction,
    updateTransaction,
};
