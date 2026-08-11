const express = require("express");

const { listGoals, createGoal, updateGoal, deleteGoal } = require("../controllers/goalController");
const { createGoalSchema, updateGoalSchema } = require("../validators/resourceValidators");
const { idParam } = require("../validators/common");
const validate = require("../middlewares/validate");

const router = express.Router();

router.get("/", listGoals);
router.post("/", validate({ body: createGoalSchema }), createGoal);
router.patch("/:id", validate({ params: idParam, body: updateGoalSchema }), updateGoal);
router.delete("/:id", validate({ params: idParam }), deleteGoal);

module.exports = router;
