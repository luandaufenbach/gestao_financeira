const mongoose = require("mongoose");

const BankCardSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        lastFourDigits: {
            type: String,
            required: true,
            maxlength: 4,
        },
        type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        limit: {
            type: Number,
            default: 0,
            min: 0,
        },
        color: {
            type: String,
            default: "#1e293b",
        },
        bank: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("BankCard", BankCardSchema);
