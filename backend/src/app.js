const express = require("express");
const cors = require("cors");

const categoriesRoutes = require("./routes/categories");
const transactionsRoutes = require("./routes/transactions");
const dashboardRoutes = require("./routes/dashboard");
const goalsRoutes = require("./routes/goals");
const bankCardsRoutes = require("./routes/bankCards");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/categories", categoriesRoutes);
app.use("/transactions", transactionsRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/goals", goalsRoutes);
app.use("/bank-cards", bankCardsRoutes);

module.exports = app;