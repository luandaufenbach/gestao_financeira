/**
 * Funções de formatação compartilhadas.
 *
 * MUDANÇA (C7): os valores agora chegam do backend em CENTAVOS (inteiros).
 * A conversão para reais acontece exclusivamente aqui, na borda de exibição —
 * nenhum cálculo da aplicação usa ponto flutuante.
 */

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

/**
 * BUG CORRIGIDO (C2): a formatação anterior usava toLocaleDateString() sem
 * especificar fuso. Como as datas são gravadas em meia-noite UTC, em
 * America/Sao_Paulo (UTC-3) uma transação de 15/03 era exibida como 14/03.
 * Fixar timeZone: "UTC" faz a data exibida ser sempre a data escolhida.
 */
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "UTC",
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

const TYPE_LABELS = {
	income: "Receita",
	debit: "Débito",
	credit: "Crédito",
	savings: "Guardado",
	withdrawal: "Resgate",
	invoice_payment: "Fatura paga",
};

/**
 * Tipos que AUMENTAM o dinheiro disponível.
 *
 * O resgate entra aqui junto com a receita: embora não seja ganho novo, o
 * dinheiro volta da reserva para a conta. Na lista ele aparece com "+" e em
 * verde, porque é isso que acontece com o saldo.
 */
const INFLOW_TYPES = ["income", "withdrawal"];

/** Movimentam a reserva; são os que podem apontar para uma meta. */
const SAVINGS_TYPES = ["savings", "withdrawal"];

export function useFormatters() {
	/** Centavos -> "R$ 1.234,56" */
	function formatCurrency(valueInCents) {
		const cents = Number(valueInCents);
		return currencyFormatter.format(Number.isFinite(cents) ? cents / 100 : 0);
	}

	/** Data ISO -> "15/03/2026", sempre lida em UTC. */
	function formatDate(isoDate) {
		if (!isoDate) return "Sem data";
		const date = new Date(isoDate);
		return Number.isNaN(date.getTime()) ? String(isoDate) : dateFormatter.format(date);
	}

	/**
	 * Data ISO -> "2026-03-15", para preencher <input type="date">.
	 * Usa os componentes UTC pelo mesmo motivo do formatDate.
	 */
	function formatDateForInput(isoDate) {
		if (!isoDate) return "";
		const date = new Date(isoDate);
		if (Number.isNaN(date.getTime())) return "";
		return date.toISOString().slice(0, 10);
	}

	/** true para tipos que somam no disponível (receita e resgate). */
	function isInflow(type) {
		return INFLOW_TYPES.includes(type);
	}

	function amountColor(type) {
		return isInflow(type) ? "text-emerald-600" : "text-red-500";
	}

	/** "+" ou "−", conforme o efeito no saldo. */
	function amountSign(type) {
		return isInflow(type) ? "+" : "−";
	}

	function formatType(type) {
		return TYPE_LABELS[type] ?? type;
	}

	function formatCategory(category) {
		// A categoria agora vem populada do backend ({ name, color }) em vez de
		// ser uma string solta (A7). Aceitamos os dois formatos por segurança.
		if (!category) return "Sem categoria";
		if (typeof category === "string") return category;
		return category.name ?? "Sem categoria";
	}

	/**
	 * O que descreve a transação ao lado da data.
	 *
	 * Guardar e resgatar não têm categoria — têm destino. Antes essas linhas
	 * exibiam "Sem categoria", um vazio informativo; agora mostram a meta, ou
	 * a reserva geral quando o valor foi guardado sem objetivo.
	 */
	function formatSource(transaction) {
		if (SAVINGS_TYPES.includes(transaction?.type)) {
			return transaction.goal?.name ?? "Reserva geral";
		}
		return formatCategory(transaction?.category);
	}

	function categoryColor(category, fallback = "#94a3b8") {
		if (!category || typeof category === "string") return fallback;
		return category.color ?? fallback;
	}

	/** Percentual de progresso (0-100), com os dois valores em centavos. */
	function calculateProgress(currentInCents, targetInCents) {
		if (!targetInCents || targetInCents <= 0) return 0;
		return Math.min(100, Math.round((currentInCents / targetInCents) * 100));
	}

	// ── Conversão para os formulários ──────────────────────────
	/** "1234,56" ou 1234.56 -> 123456 centavos */
	function parseCurrencyToCents(input) {
		if (input === "" || input === null || input === undefined) return null;

		const normalized = typeof input === "string" ? input.replace(",", ".") : input;
		const parsed = Number(normalized);

		if (!Number.isFinite(parsed)) return null;
		// Arredonda para evitar que 19.99 * 100 = 1998.9999999999998 vire 1998.
		return Math.round(parsed * 100);
	}

	/** 123456 centavos -> 1234.56, para preencher <input type="number"> */
	function centsToInputValue(valueInCents) {
		if (valueInCents === null || valueInCents === undefined) return "";
		return (Number(valueInCents) / 100).toFixed(2);
	}

	return {
		formatCurrency,
		formatDate,
		formatDateForInput,
		amountColor,
		amountSign,
		isInflow,
		formatType,
		formatCategory,
		formatSource,
		categoryColor,
		calculateProgress,
		parseCurrencyToCents,
		centsToInputValue,
	};
}
