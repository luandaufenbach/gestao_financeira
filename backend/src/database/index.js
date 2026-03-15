const mongoose = require("mongoose");

const uri = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(uri);
        console.log("MongoDB conectado");
    } catch (error) {
        console.error("Não foi possível conectar ao MongoDB:",error.message);
        process.exit(1)
    }
};

module.exports = connectDB;