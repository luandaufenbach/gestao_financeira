import { describe, it, expect } from "vitest";
import { splitIntoInstallments, toCents, fromCents } from "../src/utils/money.js";
import { getMonthRangeUTC, normalizeToUTCDay, addMonthsUTC } from "../src/utils/date.js";

describe("money.splitIntoInstallments", () => {
	it("distribui o resto sem perder nem criar centavos", () => {
		// R$100 em 3x — o caso que antes gravava 33.333333333333336
		const parcels = splitIntoInstallments(10_000, 3);

		expect(parcels).toEqual([3334, 3333, 3333]);
		expect(parcels.reduce((a, b) => a + b, 0)).toBe(10_000);
	});

	it("mantém a soma exata para qualquer combinação", () => {
		for (let total = 0; total < 500; total += 7) {
			for (let n = 1; n <= 12; n += 1) {
				const parcels = splitIntoInstallments(total, n);

				expect(parcels).toHaveLength(n);
				expect(parcels.reduce((a, b) => a + b, 0)).toBe(total);
				// Duas parcelas nunca diferem em mais de 1 centavo.
				expect(Math.max(...parcels) - Math.min(...parcels)).toBeLessThanOrEqual(1);
			}
		}
	});

	it("rejeita entradas inválidas", () => {
		expect(() => splitIntoInstallments(100.5, 2)).toThrow(TypeError);
		expect(() => splitIntoInstallments(-100, 2)).toThrow(TypeError);
		expect(() => splitIntoInstallments(100, 0)).toThrow(TypeError);
	});
});

describe("money.toCents", () => {
	it("arredonda corretamente valores que sofrem com float", () => {
		// 19.99 * 100 = 1998.9999999999998 em ponto flutuante
		expect(toCents(19.99)).toBe(1999);
		expect(toCents(0.1 + 0.2)).toBe(30);
		expect(fromCents(1999)).toBe(19.99);
	});
});

describe("date.getMonthRangeUTC", () => {
	it("cobre o mês inteiro em UTC, independentemente do fuso do servidor", () => {
		const { start, end } = getMonthRangeUTC(2026, 3);

		expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
		expect(end.toISOString()).toBe("2026-03-31T23:59:59.999Z");
	});

	it("inclui a transação do dia 1º no mês certo (regressão do bug de fuso)", () => {
		// Este era o bug: com new Date(y, m, 1) em UTC-3, o início de março
		// virava 2026-03-01T03:00:00Z e a transação do dia 1º caía em fevereiro.
		const primeiroDeMarco = new Date("2026-03-01T00:00:00.000Z");

		const marco = getMonthRangeUTC(2026, 3);
		expect(primeiroDeMarco >= marco.start && primeiroDeMarco <= marco.end).toBe(true);

		const fevereiro = getMonthRangeUTC(2026, 2);
		expect(primeiroDeMarco >= fevereiro.start && primeiroDeMarco <= fevereiro.end).toBe(false);
	});

	it("trata ano bissexto", () => {
		expect(getMonthRangeUTC(2024, 2).end.toISOString()).toBe("2024-02-29T23:59:59.999Z");
		expect(getMonthRangeUTC(2026, 2).end.toISOString()).toBe("2026-02-28T23:59:59.999Z");
	});

	it("rejeita mês fora do intervalo", () => {
		expect(() => getMonthRangeUTC(2026, 13)).toThrow(RangeError);
		expect(() => getMonthRangeUTC(2026, 0)).toThrow(RangeError);
	});
});

describe("date.normalizeToUTCDay", () => {
	it("ancora a data do input HTML em meia-noite UTC", () => {
		expect(normalizeToUTCDay("2026-03-15").toISOString()).toBe("2026-03-15T00:00:00.000Z");
	});

	it("devolve null para data inválida", () => {
		expect(normalizeToUTCDay("não é data")).toBeNull();
	});
});

describe("date.addMonthsUTC", () => {
	it("não estoura o dia ao somar meses em fim de mês", () => {
		// setMonth() nativo transformaria 31/01 + 1 mês em 03/03.
		const jan31 = new Date("2026-01-31T00:00:00.000Z");

		expect(addMonthsUTC(jan31, 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
		expect(addMonthsUTC(jan31, 2).toISOString()).toBe("2026-03-31T00:00:00.000Z");
	});

	it("atravessa a virada de ano", () => {
		const nov15 = new Date("2026-11-15T00:00:00.000Z");

		expect(addMonthsUTC(nov15, 3).toISOString()).toBe("2027-02-15T00:00:00.000Z");
	});
});
