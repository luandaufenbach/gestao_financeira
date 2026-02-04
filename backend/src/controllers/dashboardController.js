const Transaction = require("../models/Transaction");

const getMonthlyBalance = async (req, res) => {
    try {
        const now = new Date();

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
        );

        const transactions = await Transaction.find({
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
        });

        let balance = 0;

        transactions.forEach((transaction) => {
            if (transaction.type === "debit") {
                balance -= transaction.value;
            }
            if (transaction.type === "income") {
                balance += transaction.value;
            }
            if (transaction.type === "savings") {
                balance -= transaction.value;
            }

        });

        return res.json({ balance });
    } catch (error) {
        return res.status(500).json({
            error: "Erro ao calcular saldo do mês",
        });
    }
};

const getCreditCardInvoice = async (req, res) => {
    try {
        const now = new Date();

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
        );

        const transactions = await Transaction.find({
            type: "credit",
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
        });

        const invoice = transactions.reduce(
            (total, t) => total + t.value,
            0
        );

        return res.json({ invoice });
    } catch (error) {
        return res.status(500).json({
            error: "Erro ao calcular fatura do cartão",
        });
    }
};

const getSavedMoney = async (req, res) => {
    try {
        const now = new Date();

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
        );

        const transactions = await Transaction.find({
            type: "savings",
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
        });

        const saved = transactions.reduce(
            (total, t) => total + t.value,
            0
        );

        return res.json({ saved });
    } catch (error) {
        return res.status(500).json({
            error: "Erro ao calcular valor guardado",
        });
    }
};

module.exports = {
    getMonthlyBalance,
    getCreditCardInvoice,
    getSavedMoney,
};
