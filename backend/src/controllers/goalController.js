const Goal = require("../models/Goal");

const listGoals = async (req, res) => {
    try {
        const goals = await Goal.find().sort({ createdAt: -1 });
        return res.json(goals);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao listar metas" });
    }
};

const createGoal = async (req, res) => {
    try {
        const { name, targetAmount, currentAmount, color, deadline, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "O campo 'name' é obrigatório" });
        }

        const goal = await Goal.create({
            name: name.trim(),
            targetAmount: typeof targetAmount === "number" ? targetAmount : 0,
            currentAmount: currentAmount ?? 0,
            color,
            deadline,
            description,
        });

        return res.status(201).json(goal);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao criar meta" });
    }
};

const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Goal.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!updated) {
            return res.status(404).json({ message: "Meta não encontrada" });
        }

        return res.json(updated);
    } catch (error) {
        return res.status(400).json({ message: "Id inválido" });
    }
};

const deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Goal.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Meta não encontrada" });
        }

        return res.json({ message: "Meta removida" });
    } catch (error) {
        return res.status(400).json({ message: "Id inválido" });
    }
};

module.exports = { listGoals, createGoal, updateGoal, deleteGoal };
