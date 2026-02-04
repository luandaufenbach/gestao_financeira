const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["debit", "credit", "income", "savings"],
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
        date: {
            type: Date,
            required: true,
        },
        installment: {
            total: {
                type: Number,
                default: 1,
            },
            current: {
                type: Number,
                default: 1,
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);