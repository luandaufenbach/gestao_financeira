const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        color: {
            type: String,
            default: "#64748b",
        },
        icon: {
            type: String,
            default: "tag",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);