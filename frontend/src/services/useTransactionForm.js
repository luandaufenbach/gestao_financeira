/**
 * Composable para compartilhar lógica de transação entre NewTransactionalModal e EditTransactionModal
 * Inclui validação, estados de form, watchers, etc
 * 
 * Uso:
 * const { type, category, value, ... } = useTransactionForm(categories)
 */
import { ref, computed, watch } from "vue";

export function useTransactionForm(categories, initialTransaction = null) {
    const type = ref(initialTransaction?.type || "debit");
    const installments = ref(initialTransaction?.installment?.total || 1);
    const value = ref(initialTransaction?.value || "");
    const date = ref(initialTransaction ? formatDateForInput(initialTransaction.date) : "");
    const category = ref(initialTransaction?.category || "");
    const description = ref(initialTransaction?.description || "");
    const errorMessage = ref("");

    /**
     * Formata data ISO para input type="date"
     */
    function formatDateForInput(isoDate) {
        if (!isoDate) return "";
        const d = new Date(isoDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    /**
     * Determina se o tipo atual requer categoria
     */
    const requiresCategory = computed(() => ["debit", "credit"].includes(type.value));

    /**
     * Formata lista de categorias com cores
     */
    const categoryOptions = computed(() => {
        return categories.value || [];
    });

    /**
     * Watch: quando tipo muda, reseta categoria se não necessária
     */
    watch(
        () => type.value,
        (nextType) => {
            if (!["debit", "credit"].includes(nextType)) {
                category.value = "";
                installments.value = 1;
            }
            // Se muda para não-credit, reseta parcelas
            if (nextType !== "credit") {
                installments.value = 1;
            }
        }
    );

    /**
     * Valida os dados do formulário
     * @returns {boolean} true se válido, false caso contrário
     */
    function validate() {
        errorMessage.value = "";

        if (!description.value.trim()) {
            errorMessage.value = "Descrição é obrigatória.";
            return false;
        }

        if (!value.value || Number(value.value) < 0) {
            errorMessage.value = "Informe um valor válido.";
            return false;
        }

        if (!date.value) {
            errorMessage.value = "Informe a data da transação.";
            return false;
        }

        if (requiresCategory.value && !category.value) {
            errorMessage.value = "Selecione uma categoria para débito/crédito.";
            return false;
        }

        return true;
    }

    /**
     * Retorna os dados do formulário estruturados para envio
     */
    function getFormData() {
        return {
            type: type.value,
            description: description.value.trim(),
            value: parseFloat(value.value),
            date: date.value,
            category: requiresCategory.value ? category.value : undefined,
            installment: {
                total: parseInt(installments.value),
                current: 1,
            },
        };
    }

    /**
     * Reseta o formulário para o estado inicial
     */
    function reset() {
        type.value = "debit";
        installments.value = 1;
        value.value = "";
        date.value = "";
        category.value = "";
        description.value = "";
        errorMessage.value = "";
    }

    /**
     * Pré-carrega dados de uma transação existente (para edição)
     */
    function loadTransaction(transaction) {
        if (!transaction) return;
        type.value = transaction.type || "debit";
        description.value = transaction.description || "";
        value.value = transaction.value || "";
        date.value = formatDateForInput(transaction.date);
        category.value = transaction.category || "";
        installments.value = transaction.installment?.total || 1;
    }

    return {
        // Estado
        type,
        category,
        value,
        date,
        description,
        installments,
        errorMessage,
        categoryOptions,

        // Computados
        requiresCategory,

        // Métodos
        validate,
        getFormData,
        reset,
        loadTransaction,
        formatDateForInput,
    };
}
