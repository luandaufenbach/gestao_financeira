require("dotenv").config();

const app = require("./app");
const connectDB = require("./database/index");

const PORT = process.env.PORT || 3000;

(async () => {
	await connectDB();

	app.listen(PORT, () => {
		console.log(`Servidor rodando na porta ${PORT}`);
	});
})();
