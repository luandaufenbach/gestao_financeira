const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        targetAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        currentAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        color: {
            type: String,
            default: "#22c55e",
        },
        deadline: {
            type: Date,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Goal", GoalSchema);
