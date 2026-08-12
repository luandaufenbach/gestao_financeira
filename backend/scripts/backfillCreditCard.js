/**
 * Vincula ao cartão as compras no crédito criadas sem ele.
 *
 * MOTIVO: até a introdução do seletor de cartão no formulário, toda compra no
 * crédito era gravada com `bankCard: null`. Como a fatura é montada filtrando
 * pelo cartão, essas compras não apareciam em fatura nenhuma — o sintoma era um
 * card de Faturas vazio mesmo com compras lançadas.
 *
 * O script só age quando a resposta é inequívoca: usuários com exatamente UM
 * cartão de crédito. Com dois ou mais não há como adivinhar onde a compra foi
 * feita, e chutar seria pior do que deixar visível — esses casos são apenas
 * relatados, para correção manual na tela de edição.
 *
 * É idempotente: rodar de novo não altera nada, porque só toca em `bankCard: null`.
 *
 *   node scripts/backfillCreditCard.js          (simulação, não grava)
 *   node scripts/backfillCreditCard.js --apply  (grava)
 */
require("dotenv").config();

const mongoose = require("mongoose");
const { mongoUri } = require("../src/config/env");
const Transaction = require("../src/models/Transaction");
const BankCard = require("../src/models/BankCard");

const apply = process.argv.includes("--apply");

async function main() {
	await mongoose.connect(mongoUri);

	const orphanUserIds = await Transaction.distinct("user", { type: "credit", bankCard: null });

	if (orphanUserIds.length === 0) {
		console.log("Nenhuma compra no crédito sem cartão. Nada a fazer.");
		return;
	}

	let updated = 0;
	let skipped = 0;

	for (const userId of orphanUserIds) {
		const cards = await BankCard.find({ user: userId, type: "credit" }).select("_id name").lean();

		const pending = await Transaction.countDocuments({
			user: userId,
			type: "credit",
			bankCard: null,
		});

		if (cards.length !== 1) {
			console.warn(
				`usuário ${userId}: ${pending} compra(s) sem cartão, mas ${cards.length} cartões de crédito — ` +
					"defina o cartão manualmente ao editar cada compra."
			);
			skipped += pending;
			continue;
		}

		const [card] = cards;
		console.log(`usuário ${userId}: ${pending} compra(s) -> "${card.name}"`);

		if (apply) {
			const result = await Transaction.updateMany(
				{ user: userId, type: "credit", bankCard: null },
				{ $set: { bankCard: card._id } }
			);
			updated += result.modifiedCount;
		} else {
			updated += pending;
		}
	}

	console.log(
		apply
			? `\n${updated} compra(s) vinculada(s), ${skipped} pendente(s) de decisão manual.`
			: `\nSIMULAÇÃO: ${updated} compra(s) seriam vinculadas, ${skipped} ficariam pendentes.\n` +
					"Rode com --apply para gravar."
	);
}

main()
	.catch((error) => {
		console.error("Falhou:", error.message);
		process.exitCode = 1;
	})
	.finally(() => mongoose.disconnect());
