import { describe, it, expect } from "vitest";
import {
	cycleForPurchase,
	cycleRange,
	recentCycles,
	cycleLabel,
} from "../src/utils/invoiceCycle.js";

/** O cartão do usuário: fecha dia 01, vence dia 05 do mesmo mês. */
const CARD = { closingDay: 1, dueDay: 5 };

/** Cartão no padrão mais comum: fecha dia 28, vence dia 05 do mês seguinte. */
const CARD_28_05 = { closingDay: 28, dueDay: 5 };

const at = (iso) => new Date(`${iso}T12:00:00.000Z`);

describe("cycleForPurchase — cartão que fecha 01 e vence 05", () => {
	it("compra em julho cai na fatura de agosto", () => {
		const result = cycleForPurchase(at("2026-07-15"), CARD);

		expect(result.cycle).toBe("2026-08");
		expect(result.closingDate.toISOString().slice(0, 10)).toBe("2026-08-01");
		expect(result.dueDate.toISOString().slice(0, 10)).toBe("2026-08-05");
	});

	it("compra no próprio dia do fechamento ainda entra nessa fatura", () => {
		const result = cycleForPurchase(at("2026-08-01"), CARD);

		expect(result.cycle).toBe("2026-08");
	});

	it("compra no dia seguinte ao fechamento já vai para a fatura seguinte", () => {
		const result = cycleForPurchase(at("2026-08-02"), CARD);

		expect(result.cycle).toBe("2026-09");
	});
});

describe("cycleForPurchase — cartão que fecha 28 e vence 05 do mês seguinte", () => {
	it("compra antes do fechamento vence no mês seguinte", () => {
		const result = cycleForPurchase(at("2026-07-15"), CARD_28_05);

		expect(result.closingDate.toISOString().slice(0, 10)).toBe("2026-07-28");
		expect(result.dueDate.toISOString().slice(0, 10)).toBe("2026-08-05");
		expect(result.cycle).toBe("2026-08");
	});

	it("compra depois do fechamento só é paga quase dois meses depois", () => {
		// A surpresa clássica: comprou dia 30/07, paga só em 05/09.
		const result = cycleForPurchase(at("2026-07-30"), CARD_28_05);

		expect(result.closingDate.toISOString().slice(0, 10)).toBe("2026-08-28");
		expect(result.dueDate.toISOString().slice(0, 10)).toBe("2026-09-05");
		expect(result.cycle).toBe("2026-09");
	});
});

describe("viradas de ano e meses curtos", () => {
	it("dezembro vira janeiro", () => {
		expect(cycleForPurchase(at("2026-12-15"), CARD).cycle).toBe("2027-01");
	});

	it("cartão que fecha dia 31 fecha no último dia de fevereiro", () => {
		const card = { closingDay: 31, dueDay: 10 };
		const result = cycleForPurchase(at("2026-02-15"), card);

		// Fevereiro de 2026 tem 28 dias — o fechamento não escorrega para março.
		expect(result.closingDate.toISOString().slice(0, 10)).toBe("2026-02-28");
	});

	it("respeita o ano bissexto", () => {
		const card = { closingDay: 31, dueDay: 10 };
		const result = cycleForPurchase(at("2024-02-15"), card);

		expect(result.closingDate.toISOString().slice(0, 10)).toBe("2024-02-29");
	});
});

describe("cycleRange", () => {
	it("cobre do dia seguinte ao fechamento anterior até o fechamento atual", () => {
		const range = cycleRange("2026-08", CARD);

		// Fatura de agosto: compras de 02/07 (logo após o fechamento de 01/07)
		// até 01/08, o fechamento deste ciclo.
		expect(range.start.toISOString()).toBe("2026-07-02T00:00:00.000Z");
		expect(range.end.toISOString()).toBe("2026-08-01T23:59:59.999Z");
		expect(range.dueDate.toISOString()).toBe("2026-08-05T00:00:00.000Z");
	});

	it("intervalo e fechamento batem com o ciclo de quem fecha dia 28", () => {
		const range = cycleRange("2026-09", CARD_28_05);

		expect(range.closingDate.toISOString().slice(0, 10)).toBe("2026-08-28");
		expect(range.dueDate.toISOString().slice(0, 10)).toBe("2026-09-05");
		// O ciclo anterior fechou em 28/07 às 23:59:59.999, então este começa
		// no dia 29 — e não no próprio dia do fechamento anterior.
		expect(range.start.toISOString()).toBe("2026-07-29T00:00:00.000Z");
	});

	it("é o inverso exato de cycleForPurchase", () => {
		// Toda compra precisa cair dentro do intervalo do ciclo que lhe foi
		// atribuído — a ida e a volta têm que fechar.
		for (const card of [CARD, CARD_28_05, { closingDay: 15, dueDay: 22 }]) {
			for (let day = 1; day <= 28; day += 1) {
				const purchase = at(`2026-07-${String(day).padStart(2, "0")}`);
				const { cycle } = cycleForPurchase(purchase, card);
				const range = cycleRange(cycle, card);

				expect(purchase >= range.start && purchase <= range.end).toBe(true);
			}
		}
	});

	it("devolve null para ciclo malformado", () => {
		expect(cycleRange("agosto", CARD)).toBeNull();
		expect(cycleRange("2026-13", CARD)).toBeNull();
	});
});

describe("recentCycles", () => {
	it("lista do mais recente para o mais antigo, incluindo o aberto", () => {
		const cycles = recentCycles(CARD, 3, at("2026-08-20"));

		// Em 20/08 a fatura aberta é a que fecha em 01/09.
		expect(cycles.map((c) => c.cycle)).toEqual(["2026-09", "2026-08", "2026-07"]);
	});

	it("atravessa a virada de ano", () => {
		const cycles = recentCycles(CARD, 3, at("2027-01-10"));

		expect(cycles.map((c) => c.cycle)).toEqual(["2027-02", "2027-01", "2026-12"]);
	});
});

describe("cycleLabel", () => {
	it("formata em português", () => {
		expect(cycleLabel("2026-08")).toBe("agosto de 2026");
	});
});
