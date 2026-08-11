/**
 * Utilitários de dinheiro — todos os valores trafegam e são gravados como
 * INTEIROS EM CENTAVOS.
 *
 * MOTIVO DA MUDANÇA (C7): antes os valores eram Number (float64). Isso trazia
 * dois problemas concretos:
 *   1. 0.1 + 0.2 !== 0.3 — o erro se acumulava nas somas do dashboard.
 *   2. R$100 em 3x virava 33.333333333333336 gravado no banco, e a soma das
 *      parcelas nunca fechava com o total.
 *
 * Com centavos inteiros, toda a aritmética é exata. A conversão para exibição
 * acontece só na borda (formatação no front).
 */

const MAX_SAFE_CENTS = Number.MAX_SAFE_INTEGER;

/**
 * Divide um valor em N parcelas sem perder nem criar centavos.
 *
 * BUG CORRIGIDO (C7): a versão anterior fazia `value / total` e gravava a
 * dízima. Aqui o resto da divisão é distribuído entre as primeiras parcelas,
 * de modo que a soma das parcelas é SEMPRE exatamente igual ao total.
 *
 * Ex.: 10000 centavos (R$100) em 3x -> [3334, 3333, 3333], soma = 10000.
 *
 * @param {number} totalCents - Valor total em centavos.
 * @param {number} installments - Quantidade de parcelas (>= 1).
 * @returns {number[]} Valor de cada parcela, em centavos.
 */
function splitIntoInstallments(totalCents, installments) {
	if (!Number.isInteger(totalCents) || totalCents < 0) {
		throw new TypeError("totalCents deve ser um inteiro não negativo");
	}
	if (!Number.isInteger(installments) || installments < 1) {
		throw new TypeError("installments deve ser um inteiro >= 1");
	}

	const base = Math.floor(totalCents / installments);
	const remainder = totalCents % installments;

	return Array.from({ length: installments }, (_, index) =>
		// As `remainder` primeiras parcelas recebem 1 centavo a mais.
		index < remainder ? base + 1 : base
	);
}

/** Verifica se o valor é um montante válido em centavos. */
function isValidCents(value) {
	return Number.isInteger(value) && value >= 0 && value <= MAX_SAFE_CENTS;
}

/**
 * Converte um valor em reais (float, vindo de entrada do usuário) para centavos.
 * Usa arredondamento para evitar que 19.99 * 100 = 1998.9999999999998 vire 1998.
 */
function toCents(amountInCurrency) {
	const parsed = Number(amountInCurrency);
	if (!Number.isFinite(parsed)) return null;
	return Math.round(parsed * 100);
}

/** Converte centavos para reais. Use apenas para exibição/relatórios. */
function fromCents(cents) {
	return cents / 100;
}

module.exports = {
	splitIntoInstallments,
	isValidCents,
	toCents,
	fromCents,
	MAX_SAFE_CENTS,
};
