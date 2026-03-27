import { ref, onMounted } from "vue";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "./api";

export function useTransactions() {

    const transactions = ref([]); 
    const loading = ref(false);

    /**
     * Carregar todas as transações do backend filtradas por ano e mês
     * @param {number} year - Ano (opcional)
     * @param {number} month - Mês (opcional)
     */
    async function loadTransactions(year, month) {
        try {
            loading.value = true;
            const data = await getTransactions(year, month);
            transactions.value = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Erro ao carregar transações:", error);
            transactions.value = [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * Criar uma nova transação
     * @param {Object} transactionData - Dados da transação
     * @returns {Promise<Object>} A transação criada
     */
    async function createNew(transactionData) {
        try {
            const newTransaction = await createTransaction(transactionData);
            // Adiciona na lista sem recarregar
            transactions.value.push(newTransaction);
            return newTransaction;
        } catch (error) {
            console.error("Erro ao criar transação:", error);
            throw error;
        }
    }

    /**
     * Atualizar uma transação existente
     * @param {string} id - ID da transação
     * @param {Object} transactionData - Dados atualizados
     * @returns {Promise<Object>} A transação atualizada
     */
    async function update(id, transactionData) {
        try {
            const updated = await updateTransaction(id, transactionData);
            // Atualiza na lista local
            const index = transactions.value.findIndex(t => t._id === id);
            if (index !== -1) {
                transactions.value[index] = updated;
            }
            return updated;
        } catch (error) {
            console.error("Erro ao atualizar transação:", error);
            throw error;
        }
    }

    /**
     * Deletar uma transação
     * @param {string} id - ID da transação
     * @returns {Promise<void>}
     */
    async function remove(id) {
        try {
            await deleteTransaction(id);
            // Remove da lista local
            transactions.value = transactions.value.filter(t => t._id !== id);
        } catch (error) {
            console.error("Erro ao deletar transação:", error);
            throw error;
        }
    }

    // ── EXPOR AS FUNÇÕES E DADOS PARA OS COMPONENTES ──
    return {
        transactions,
        loading,
        loadTransactions,
        createNew,
        update,
        remove,
    };
}
