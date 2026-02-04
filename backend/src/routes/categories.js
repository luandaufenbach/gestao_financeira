const express = require("express");

const {
    listCategories,
    createCategory,
    deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", listCategories);
router.post("/", createCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
