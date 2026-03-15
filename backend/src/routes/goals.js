const express = require("express");
const { listGoals, createGoal, updateGoal, deleteGoal } = require("../controllers/goalController");

const router = express.Router();

router.get("/", listGoals);
router.post("/", createGoal);
router.patch("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;
