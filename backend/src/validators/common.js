const { z } = require("zod");
const mongoose = require("mongoose");

/** Valida um ObjectId do MongoDB vindo da URL ou do corpo. */
const objectId = z
	.string()
	.refine((value) => mongoose.Types.ObjectId.isValid(value), { message: "Id inválido" });

/** Params de rota no formato /:id */
const idParam = z.object({ id: objectId });

/** Cor hexadecimal #RRGGBB */
const hexColor = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)");

/**
 * Valor monetário em CENTAVOS.
 *
 * O cliente envia inteiros; qualquer fração é rejeitada aqui, antes de chegar
 * ao banco. Ver backend/src/utils/money.js para o porquê (C7).
 */
const cents = z
	.number()
	.int("Valor deve ser um inteiro em centavos")
	.min(0, "Valor não pode ser negativo")
	.max(Number.MAX_SAFE_INTEGER);

/**
 * Filtro de mês/ano usado pelo dashboard e pela listagem de transações.
 * Vem da query string, portanto chega como texto e precisa ser convertido.
 */
const monthQuery = z.object({
	year: z.coerce.number().int().min(1970).max(9999).optional(),
	month: z.coerce.number().int().min(1).max(12).optional(),
});

/** Data no formato do input HTML (YYYY-MM-DD) ou ISO completa. */
const dateString = z
	.string()
	.refine((value) => !Number.isNaN(new Date(value).getTime()), { message: "Data inválida" });

module.exports = { objectId, idParam, hexColor, cents, monthQuery, dateString };
