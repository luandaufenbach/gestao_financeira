const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

const getMonthRange = (year, month) => {
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    return {
        startOfMonth: new Date(y, m, 1),
        endOfMonth: new Date(y, m + 1, 0, 23, 59, 59),
    };
};

const getMonthlyBalance = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthRange(req.query.year, req.query.month);

        const transactions = await Transaction.find({
            date: { $gte: startOfMonth, $lte: endOfMonth },
        });

        let balance = 0;
        transactions.forEach((t) => {
            if (t.type === "income") balance += t.value; // Adiciona receita
            if (t.type === "debit" || t.type === "credit") balance -= t.value; // Subtrai despesa
            // "savings" não entra no saldo do mês, é um valor guardado separado
        });

        return res.json({ balance });
    } catch (error) {
        console.error("Erro ao calcular saldo do mês:", error.message);
        return res.status(500).json({ error: "Erro ao calcular saldo do mês" });
    }
};

const getCreditCardInvoice = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthRange(req.query.year, req.query.month);

        const transactions = await Transaction.find({
            type: "credit",
            date: { $gte: startOfMonth, $lte: endOfMonth },
        });

        const invoice = transactions.reduce((total, t) => total + t.value, 0);
        return res.json({ invoice });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao calcular fatura do cartão" });
    }
};

const getSavedMoney = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthRange(req.query.year, req.query.month);

        const transactions = await Transaction.find({
            type: "savings",
            date: { $gte: startOfMonth, $lte: endOfMonth },
        });

        const saved = transactions.reduce((total, t) => total + t.value, 0);
        return res.json({ saved });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao calcular valor guardado" });
    }
};

const getTotalSavedMoney = async (req, res) => {
    try {
        const transactions = await Transaction.find({ type: "savings" });

        const saved = transactions.reduce((total, t) => total + t.value, 0);
        return res.json({ saved });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao calcular valor guardado total" });
    }
};

const getCategoryBreakdown = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthRange(req.query.year, req.query.month);

        const transactions = await Transaction.find({
            type: { $in: ["debit", "credit"] },
            date: { $gte: startOfMonth, $lte: endOfMonth },
        });

        const breakdown = {};
        transactions.forEach((t) => {
            const cat = t.category || "outros";
            breakdown[cat] = (breakdown[cat] || 0) + t.value;
        });

        // Buscar cores das categorias
        const result = await Promise.all(
            Object.entries(breakdown).map(async ([category, total]) => {
                const categoryDoc = await Category.findOne({ name: category });
                return {
                    category,
                    total,
                    color: categoryDoc?.color || "#94a3b8", // cor padrão se não encontrar
                };
            })
        );

        return res.json(result);
    } catch (error) {
        console.error("Erro ao calcular breakdown:", error.message);
        return res.status(500).json({ error: "Erro ao calcular breakdown por categoria" });
    }
};

module.exports = {
    getMonthlyBalance,
    getCreditCardInvoice,
    getSavedMoney,
    getTotalSavedMoney,
    getCategoryBreakdown,
};
