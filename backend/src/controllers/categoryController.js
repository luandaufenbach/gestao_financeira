const Category = require("../models/Category");

const listCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        return res.json(categories);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao listar categorias" });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, color, icon } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "O campo 'name' é obrigatório" });
        }

        const created = await Category.create({
            name: name.trim(),
            color,
            icon,
        });

        return res.status(201).json(created);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Categoria já existe" });
        }
        return res.status(500).json({ message: "Erro ao criar categoria" });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Category.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Categoria não encontrada" });
        }

        return res.json({ message: "Categoria removida" });
    } catch (error) {
        return res.status(400).json({ message: "Id inválido" });
    }
};

module.exports = {
    listCategories,
    createCategory,
    deleteCategory,
};
