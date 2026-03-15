const Transaction = require("../models/Transaction");

const EXPENSE_CATEGORIES = ["mercado", "combustivel", "lazer", "saude", "outros"];

const isExpenseType = (type) => ["debit", "credit"].includes(type);

const getMonthRange = (year, month) => {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) - 1 : now.getMonth();
    return {
        start: new Date(y, m, 1),
        end: new Date(y, m + 1, 0, 23, 59, 59, 999),
    };
};

const listTransactions = async (req, res) => {
    try {
        const query = {};
        const hasMonthFilter = req.query.year || req.query.month;

        if (hasMonthFilter) {
            const { start, end } = getMonthRange(req.query.year, req.query.month);
            query.date = { $gte: start, $lte: end };
        }

        const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
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

        if (isExpenseType(type) && !EXPENSE_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: "Categoria inválida para transações de débito/crédito" });
        }

        const totalInstallments = installment?.total || 1;
        const currentInstallment = installment?.current || 1;

        // Se é parcelado, criar uma transação para cada parcela
        if (totalInstallments > 1) {
            const transactions = [];
            const startDate = new Date(date);
            const parcelValue = value / totalInstallments; // Divide o valor pelas parcelas
            const installmentGroupId = require("crypto").randomUUID(); // Gera um ID único para o grupo

            for (let i = 1; i <= totalInstallments; i++) {
                const parcelDate = new Date(startDate);
                parcelDate.setMonth(parcelDate.getMonth() + (i - 1));

                const transaction = await Transaction.create({
                    type,
                    description: description.trim(),
                    value: parcelValue, // Usa o valor dividido
                    date: parcelDate,
                    installment: {
                        total: totalInstallments,
                        current: i,
                    },
                    installmentGroupId, // Conecta todas as parcelas
                    category: isExpenseType(type) ? category : undefined,
                });

                transactions.push(transaction);
            }

            return res.status(201).json(transactions[0]); // Retorna a primeira parcela
        } else {
            // Transação sem parcelamento
            const created = await Transaction.create({
                type,
                description: description.trim(),
                value,
                date,
                installment: {
                    total: 1,
                    current: 1,
                },
                category: isExpenseType(type) ? category : undefined,
            });

            return res.status(201).json(created);
        }
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

        // Se é uma transação parcelada, deleta todas as parcelas do mesmo grupo
        if (deleted.installmentGroupId) {
            await Transaction.deleteMany({
                installmentGroupId: deleted.installmentGroupId
            });
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

        const existing = await Transaction.findById(id);
        if (!existing) {
            return res.status(404).json({ message: "Transação não encontrada" });
        }

        if (description && (!description.trim())) {
            return res.status(400).json({ message: "Descrição não pode estar vazia" });
        }
        if (value !== undefined && (typeof value !== "number" || value < 0)) {
            return res.status(400).json({ message: "Valor deve ser um número maior ou igual a 0" });
        }

        const nextType = type ?? existing.type;
        const nextCategory = category ?? existing.category;

        if (isExpenseType(nextType) && !EXPENSE_CATEGORIES.includes(nextCategory)) {
            return res.status(400).json({ message: "Categoria inválida para transações de débito/crédito" });
        }

        const updatePayload = { type, description, value, date, installment };
        if (isExpenseType(nextType)) {
            updatePayload.category = nextCategory;
        } else {
            updatePayload.category = undefined;
        }

        // Se é uma transação parcelada, atualizar todas as parcelas do mesmo grupo
        if (existing.installmentGroupId) {
            const allInstallments = await Transaction.find({
                installmentGroupId: existing.installmentGroupId
            });

            // O valor dividido entre as parcelas
            const newParcelValue = value !== undefined ? value / allInstallments.length : existing.value;

            // Atualiza todas as parcelas com os novos dados (mantendo data e número de parcela)
            for (const inst of allInstallments) {
                await Transaction.findByIdAndUpdate(
                    inst._id,
                    {
                        type: nextType,
                        description: description?.trim() ?? inst.description,
                        value: newParcelValue,
                        category: updatePayload.category ?? inst.category,
                        // Mantém a data e número de parcela original
                    },
                    { runValidators: true }
                );
            }

            // Retorna a transação atualizada que foi solicitada
            const updated = await Transaction.findById(id);
            return res.json(updated);
        } else {
            // Transação simples (sem parcelamento)
            const updated = await Transaction.findByIdAndUpdate(
                id,
                updatePayload,
                { new: true, runValidators: true }
            );

            if (!updated) {
                return res.status(404).json({ message: "Transação não encontrada" });
            }

            return res.json(updated);
        }
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
