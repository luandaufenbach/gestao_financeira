const express = require("express");

const {
	listCategories,
	createCategory,
	updateCategory,
	deleteCategory,
} = require("../controllers/categoryController");
const { createCategorySchema, updateCategorySchema } = require("../validators/resourceValidators");
const { idParam } = require("../validators/common");
const validate = require("../middlewares/validate");

const router = express.Router();

router.get("/", listCategories);
router.post("/", validate({ body: createCategorySchema }), createCategory);
router.patch("/:id", validate({ params: idParam, body: updateCategorySchema }), updateCategory);
router.delete("/:id", validate({ params: idParam }), deleteCategory);

module.exports = router;
