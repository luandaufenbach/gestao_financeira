import { ref, computed, watch } from "vue";
import { useFormatters } from "./useFormatters";

const EXPENSE_TYPES = ["debit", "credit"];
/** Movimentam a reserva — os únicos que podem apontar para uma meta. */
const SAVINGS_TYPES = ["savings", "withdrawal"];
const MAX_INSTALLMENTS = 72;

/**
 * Lógica compartilhada entre os modais de nova transação e de edição.
 *
 * MUDANÇA CENTRAL (bug C1): o campo de valor agora representa sempre o
 * VALOR TOTAL da compra, nunca o valor de uma parcela.
 *
 * No modelo antigo, `value` era ambíguo: ao criar, o front mandava o total; ao
 * editar, mandava o valor já dividido da parcela, carregado de
 * `transaction.value`. O backend dividia por N nos dois casos, então abrir e
 * salvar uma parcela sem mexer em nada dividia o valor por N de novo, a cada
 * salvamento. Aqui, ao editar uma compra parcelada, reconstruímos o total a
 * partir da parcela e do número de parcelas.
 */
export function useTransactionForm(initialTransaction = null) {
	const { formatDateForInput, parseCurrencyToCents, centsToInputValue } = useFormatters();

	const type = ref("debit");
	const description = ref("");
	// Em reais, como o usuário digita. Convertido para centavos em getFormData().
	const amount = ref("");
	const date = ref("");
	const categoryId = ref("");
	const bankCardId = ref("");
	const goalId = ref("");
	const installments = ref(1);
	const errorMessage = ref("");

	const requiresCategory = computed(() => EXPENSE_TYPES.includes(type.value));
	const supportsInstallments = computed(() => type.value === "credit");
	/**
	 * Compra no crédito sem cartão não entra em fatura nenhuma — era exatamente
	 * o que acontecia antes deste campo existir. O backend também recusa.
	 */
	const requiresBankCard = computed(() => type.value === "credit");
	/**
	 * Guardar/resgatar aceita uma meta de destino, sempre opcional: guardar sem
	 * meta é o caso comum e cai na reserva geral. É o mesmo papel do cartão na
	 * compra no crédito — dizer para onde o dinheiro foi —, só que sem
	 * obrigatoriedade, porque reserva sem objetivo continua fazendo sentido.
	 */
	const supportsGoal = computed(() => SAVINGS_TYPES.includes(type.value));

	/**
	 * Carrega uma transação existente no formulário.
	 *
	 * `isNew` distingue criação de edição: só na edição faz sentido reconstruir
	 * o total a partir da parcela.
	 */
	function loadTransaction(transaction) {
		if (!transaction) return;

		type.value = transaction.type ?? "debit";
		description.value = transaction.description ?? "";
		date.value = formatDateForInput(transaction.date);

		// A categoria vem populada do backend ({_id, name, color}) ou nula (A7).
		categoryId.value = transaction.category?._id ?? transaction.category ?? "";
		bankCardId.value = transaction.bankCard?._id ?? transaction.bankCard ?? "";
		goalId.value = transaction.goal?._id ?? transaction.goal ?? "";

		const total = transaction.installment?.total ?? 1;
		installments.value = total;

		/**
		 * Lê o valor TOTAL da compra direto do documento.
		 *
		 * Nada de inferir a partir da parcela: como o resto da divisão é
		 * distribuído entre as primeiras parcelas, multiplicar uma parcela pelo
		 * número de parcelas dá um valor errado (3334 × 3 = 10002, não 10000).
		 * Salvar esse valor inflado somaria centavos a cada edição — exatamente
		 * a família de bug que o C1 representava.
		 *
		 * O fallback cobre documentos anteriores à introdução do campo.
		 */
		amount.value = centsToInputValue(
			transaction.installment?.totalValueInCents ?? transaction.valueInCents ?? 0
		);
	}

	if (initialTransaction) {
		loadTransaction(initialTransaction);
	}

	/**
	 * Ao trocar o tipo, limpa o que deixou de fazer sentido.
	 * Sem isso, uma categoria escolhida para "débito" continuava no payload ao
	 * mudar para "receita", e o backend a rejeitava.
	 */
	watch(type, (nextType) => {
		if (!EXPENSE_TYPES.includes(nextType)) {
			categoryId.value = "";
		}
		if (nextType !== "credit") {
			installments.value = 1;
			// O cartão só é significativo no crédito; mantê-lo ao virar receita
			// deixaria a transação vinculada a uma fatura sem fazer parte dela.
			bankCardId.value = "";
		}
		if (!SAVINGS_TYPES.includes(nextType)) {
			// Mesma ideia: uma despesa vinculada a uma meta faria o progresso dela
			// subir com dinheiro que saiu da conta. O backend também recusa.
			goalId.value = "";
		}
	});

	function validate() {
		errorMessage.value = "";

		if (!description.value.trim()) {
			errorMessage.value = "Informe uma descrição.";
			return false;
		}

		const cents = parseCurrencyToCents(amount.value);

		/**
		 * BUG CORRIGIDO (M7): a validação anterior era `if (!value.value || ...)`.
		 * Como 0 é falsy, um valor zero era rejeitado com "Informe um valor
		 * válido", embora o backend aceitasse >= 0. Agora testamos explicitamente
		 * por null e por negativo.
		 */
		if (cents === null) {
			errorMessage.value = "Informe um valor numérico válido.";
			return false;
		}
		if (cents < 0) {
			errorMessage.value = "O valor não pode ser negativo.";
			return false;
		}

		if (!date.value) {
			errorMessage.value = "Informe a data da transação.";
			return false;
		}

		if (requiresCategory.value && !categoryId.value) {
			errorMessage.value = "Selecione uma categoria para débito ou crédito.";
			return false;
		}

		if (requiresBankCard.value && !bankCardId.value) {
			errorMessage.value = "Selecione em qual cartão a compra foi feita.";
			return false;
		}

		const parcels = Number(installments.value);
		if (!Number.isInteger(parcels) || parcels < 1 || parcels > MAX_INSTALLMENTS) {
			errorMessage.value = `Parcelas deve ser um número entre 1 e ${MAX_INSTALLMENTS}.`;
			return false;
		}

		return true;
	}

	/** Payload de criação — inclui o número de parcelas. */
	function getCreatePayload() {
		return {
			type: type.value,
			description: description.value.trim(),
			totalValueInCents: parseCurrencyToCents(amount.value),
			date: date.value,
			category: requiresCategory.value ? categoryId.value : null,
			bankCard: bankCardId.value || null,
			goal: supportsGoal.value ? goalId.value || null : null,
			installments: supportsInstallments.value ? Number(installments.value) : 1,
		};
	}

	/**
	 * Payload de edição.
	 *
	 * `installments` fica de fora de propósito (bug M8): o modal antigo exibia
	 * um campo "Parcelas" editável que o backend simplesmente ignorava. Mudar a
	 * quantidade de parcelas exigiria recriar o grupo com datas novas — em vez
	 * de fingir que funciona, o campo é somente leitura na edição.
	 */
	function getUpdatePayload() {
		return {
			type: type.value,
			description: description.value.trim(),
			totalValueInCents: parseCurrencyToCents(amount.value),
			date: date.value,
			category: requiresCategory.value ? categoryId.value : null,
			bankCard: bankCardId.value || null,
			goal: supportsGoal.value ? goalId.value || null : null,
		};
	}

	function reset() {
		type.value = "debit";
		description.value = "";
		amount.value = "";
		date.value = "";
		categoryId.value = "";
		bankCardId.value = "";
		goalId.value = "";
		installments.value = 1;
		errorMessage.value = "";
	}

	return {
		type,
		description,
		amount,
		date,
		categoryId,
		bankCardId,
		goalId,
		installments,
		errorMessage,
		requiresCategory,
		requiresBankCard,
		supportsGoal,
		supportsInstallments,
		validate,
		getCreatePayload,
		getUpdatePayload,
		reset,
		loadTransaction,
		MAX_INSTALLMENTS,
	};
}
