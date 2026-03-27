import { ref, onMounted } from "vue";
import { getBankCards, createBankCard, deleteBankCard } from "./api";


export function useBankCards() {
    // ── STATE (dados que o componente vai usar) ──
    const bankCards = ref([]);      // Lista de cartões
    const loading = ref(false);     // Se está carregando

    /**
     * Carregar todos os cartões do backend
     */
    async function loadBankCards() {
        try {
            loading.value = true;
            const data = await getBankCards();
            bankCards.value = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Erro ao carregar cartões:", error);
            bankCards.value = [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * Criar um novo cartão
     * @param {Object} cardData - Dados do cartão
     * @returns {Promise<Object>} O cartão criado
     */
    async function createNew(cardData) {
        try {
            const newCard = await createBankCard(cardData);
            // Adiciona na lista sem recarregar
            bankCards.value.push(newCard);
            return newCard;
        } catch (error) {
            console.error("Erro ao criar cartão:", error);
            throw error;
        }
    }

    /**
     * Deletar um cartão
     * @param {string} id - ID do cartão
     * @returns {Promise<void>}
     */
    async function remove(id) {
        try {
            await deleteBankCard(id);
            // Remove da lista local
            bankCards.value = bankCards.value.filter(card => card._id !== id);
        } catch (error) {
            console.error("Erro ao deletar cartão:", error);
            throw error;
        }
    }

    // ── CARREGA CARTÕES QUANDO O COMPOSABLE É MONTADO ──
    onMounted(() => {
        loadBankCards();
    });

    // ── EXPOR AS FUNÇÕES E DADOS PARA OS COMPONENTES ──
    return {
        bankCards,
        loading,
        loadBankCards,
        createNew,
        remove,
    };
}
