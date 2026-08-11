/**
 * Utilitários de data — tudo em UTC, sem exceção.
 *
 * BUG CORRIGIDO (C2): a versão anterior montava o intervalo do mês com
 * `new Date(y, m, 1)`, que usa o fuso horário LOCAL do servidor, enquanto as
 * datas são gravadas no Mongo em UTC.
 *
 * Em America/Sao_Paulo (UTC-3) isso produzia:
 *   início de março = 2026-03-01T03:00:00Z
 * Ou seja, uma transação gravada em 2026-03-01T00:00:00Z ficava FORA de março
 * e caía dentro do intervalo de fevereiro. Na prática, toda transação lançada
 * no dia 1º aparecia no mês errado.
 *
 * Usando Date.UTC o intervalo é exatamente [00:00:00.000Z do dia 1,
 * 23:59:59.999Z do último dia], independentemente do fuso do servidor.
 */

/** Converte para inteiro apenas se o valor for realmente numérico. */
const toInt = (value) => {
	if (value === undefined || value === null || value === "") return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : null;
};

/**
 * Intervalo UTC de um mês.
 * @param {number|string} [year] - Ano com 4 dígitos. Padrão: ano atual (UTC).
 * @param {number|string} [month] - Mês de 1 a 12. Padrão: mês atual (UTC).
 * @returns {{ start: Date, end: Date }}
 */
function getMonthRangeUTC(year, month) {
	const now = new Date();

	const parsedYear = toInt(year);
	const parsedMonth = toInt(month);

	const y = parsedYear !== null ? parsedYear : now.getUTCFullYear();
	// Internamente o mês é 0-indexado, como no construtor de Date.
	const m = parsedMonth !== null ? parsedMonth - 1 : now.getUTCMonth();

	if (y < 1970 || y > 9999) {
		throw new RangeError("Ano fora do intervalo suportado");
	}
	if (m < 0 || m > 11) {
		throw new RangeError("Mês deve estar entre 1 e 12");
	}

	return {
		start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
		// Dia 0 do mês seguinte = último dia deste mês.
		end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
	};
}

/**
 * Normaliza uma data de entrada para meia-noite UTC.
 *
 * O front envia "2026-03-15" (input type="date"). Ancorar em 00:00:00.000Z
 * garante que o dia gravado é exatamente o dia escolhido pelo usuário e que
 * ele cai sempre dentro do intervalo do mês correspondente.
 */
function normalizeToUTCDay(input) {
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return null;

	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
	);
}

/**
 * Soma meses a uma data mantendo tudo em UTC.
 *
 * Trata o estouro de dia: 31/01 + 1 mês vira 28/02 (ou 29/02), e não 03/03
 * como faria o setMonth() nativo. Isso importa para parcelas de cartão
 * lançadas no fim do mês.
 */
function addMonthsUTC(date, monthsToAdd) {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	const day = date.getUTCDate();

	// Último dia do mês de destino.
	const lastDayOfTargetMonth = new Date(Date.UTC(year, month + monthsToAdd + 1, 0)).getUTCDate();

	return new Date(
		Date.UTC(year, month + monthsToAdd, Math.min(day, lastDayOfTargetMonth), 0, 0, 0, 0)
	);
}

module.exports = { getMonthRangeUTC, normalizeToUTCDay, addMonthsUTC };
