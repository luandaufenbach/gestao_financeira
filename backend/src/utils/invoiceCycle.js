/**
 * Ciclos de fatura de cartão de crédito.
 *
 * Um cartão tem dois dias configurados:
 *   closingDay - dia em que a fatura FECHA (para de aceitar compras novas)
 *   dueDay     - dia em que a fatura VENCE (você paga)
 *
 * A fatura é identificada pelo ANO-MÊS DO VENCIMENTO ("2026-08"), porque é
 * assim que os bancos a chamam e é o mês em que o dinheiro sai da conta.
 *
 * Consequência que costuma surpreender: uma fatura que fecha em 01/08 contém
 * compras de 02/07 a 01/08 — ou seja, quase tudo de julho, mas se chama
 * "fatura de agosto". Por isso a interface sempre exibe as duas datas junto do
 * nome; o rótulo sozinho não precisa carregar esse significado.
 *
 * Tudo em UTC, pelo mesmo motivo de utils/date.js.
 */

/** Último dia do mês (1-12 na entrada, tratando estouro para o ano seguinte). */
function lastDayOfMonth(year, monthIndex) {
	return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Data de fechamento dentro de um mês.
 *
 * `Math.min` cobre cartões que fecham no dia 31: em fevereiro o fechamento cai
 * no dia 28 (ou 29), e não escorrega para março.
 */
function closingDateFor(year, monthIndex, closingDay) {
	const day = Math.min(closingDay, lastDayOfMonth(year, monthIndex));
	return new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
}

/**
 * Vencimento correspondente a um fechamento.
 *
 * Se o dia de vencimento é maior ou igual ao de fechamento, o vencimento cai no
 * mesmo mês (fecha 01, vence 05). Se é menor, cai no mês seguinte
 * (fecha 28, vence 05 do mês que vem).
 */
function dueDateForClosing(closingDate, closingDay, dueDay) {
	const year = closingDate.getUTCFullYear();
	const monthIndex = closingDate.getUTCMonth();

	const targetMonth = dueDay >= closingDay ? monthIndex : monthIndex + 1;
	const normalizedYear = year + Math.floor(targetMonth / 12);
	const normalizedMonth = ((targetMonth % 12) + 12) % 12;

	const day = Math.min(dueDay, lastDayOfMonth(normalizedYear, normalizedMonth));

	return new Date(Date.UTC(normalizedYear, normalizedMonth, day, 0, 0, 0, 0));
}

/** Data -> "2026-08" */
function toCycleKey(date) {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08" -> { year: 2026, monthIndex: 7 }, ou null se malformado. */
function parseCycleKey(cycle) {
	const match = /^(\d{4})-(\d{2})$/.exec(String(cycle ?? ""));
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);

	if (month < 1 || month > 12) return null;

	return { year, monthIndex: month - 1 };
}

/**
 * Em qual fatura cai uma compra?
 *
 * A compra entra na primeira fatura cujo fechamento seja igual ou posterior a
 * ela. Comprou dia 30 e a fatura fechou dia 28? Cai na próxima.
 *
 * @returns {{ cycle: string, closingDate: Date, dueDate: Date }}
 */
function cycleForPurchase(purchaseDate, { closingDay, dueDay }) {
	const year = purchaseDate.getUTCFullYear();
	const monthIndex = purchaseDate.getUTCMonth();

	let closingDate = closingDateFor(year, monthIndex, closingDay);

	// Comprou depois do fechamento deste mês: vai para o ciclo seguinte.
	if (purchaseDate > closingDate) {
		closingDate = closingDateFor(year, monthIndex + 1, closingDay);
	}

	const dueDate = dueDateForClosing(closingDate, closingDay, dueDay);

	return { cycle: toCycleKey(dueDate), closingDate, dueDate };
}

/**
 * Intervalo de compras de um ciclo, a partir da chave do ciclo.
 *
 * O intervalo é (fechamento anterior, fechamento deste ciclo]: começa no
 * instante seguinte ao fechamento anterior e termina no fechamento atual.
 *
 * @returns {{ cycle, start: Date, end: Date, closingDate: Date, dueDate: Date }|null}
 */
function cycleRange(cycle, { closingDay, dueDay }) {
	const parsed = parseCycleKey(cycle);
	if (!parsed) return null;

	// Se o vencimento é antes do fechamento no calendário, o fechamento
	// aconteceu no mês anterior ao do vencimento.
	const closingMonthIndex = dueDay >= closingDay ? parsed.monthIndex : parsed.monthIndex - 1;

	const closingDate = closingDateFor(parsed.year, closingMonthIndex, closingDay);
	const previousClosing = closingDateFor(parsed.year, closingMonthIndex - 1, closingDay);

	// O fechamento anterior termina em 23:59:59.999; o ciclo começa 1ms depois.
	const start = new Date(previousClosing.getTime() + 1);

	return {
		cycle,
		start,
		end: closingDate,
		closingDate,
		dueDate: dueDateForClosing(closingDate, closingDay, dueDay),
	};
}

/**
 * Os N ciclos mais recentes, do mais novo para o mais antigo, incluindo o que
 * está aberto agora.
 */
function recentCycles(card, count = 6, referenceDate = new Date()) {
	const current = cycleForPurchase(referenceDate, card);
	const parsed = parseCycleKey(current.cycle);

	return Array.from({ length: count }, (_, index) =>
		cycleRange(toCycleKey(new Date(Date.UTC(parsed.year, parsed.monthIndex - index, 1))), card)
	);
}

/** Rótulo de exibição: "agosto de 2026". */
const MONTH_NAMES = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
];

function cycleLabel(cycle) {
	const parsed = parseCycleKey(cycle);
	if (!parsed) return cycle;
	return `${MONTH_NAMES[parsed.monthIndex]} de ${parsed.year}`;
}

module.exports = {
	cycleForPurchase,
	cycleRange,
	recentCycles,
	toCycleKey,
	parseCycleKey,
	cycleLabel,
	closingDateFor,
	dueDateForClosing,
};
