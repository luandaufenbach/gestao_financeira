const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

module.exports = app;