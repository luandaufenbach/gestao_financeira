import { ref, onMounted } from "vue";
import { getGoals, createGoal, updateGoal, deleteGoal } from "./api";

export function useGoals() {

    const goals = ref([]);      
    const loading = ref(false);     

    /**
     * Carregar todas as metas do backend
     */
    async function loadGoals() {
        try {
            loading.value = true;
            const data = await getGoals();
            goals.value = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Erro ao carregar metas:", error);
            goals.value = [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * Criar uma nova meta
     * @param {Object} goalData - Dados da meta
     * @returns {Promise<Object>} A meta criada
     */
    async function createNew(goalData) {
        try {
            const newGoal = await createGoal(goalData);
            // Adiciona na lista sem recarregar
            goals.value.push(newGoal);
            return newGoal;
        } catch (error) {
            console.error("Erro ao criar meta:", error);
            throw error;
        }
    }

    /**
     * Atualizar uma meta existente
     * @param {string} id - ID da meta
     * @param {Object} goalData - Dados atualizados
     * @returns {Promise<Object>} A meta atualizada
     */
    async function update(id, goalData) {
        try {
            const updated = await updateGoal(id, goalData);
            // Atualiza na lista local
            const index = goals.value.findIndex(g => g._id === id);
            if (index !== -1) {
                goals.value[index] = updated;
            }
            return updated;
        } catch (error) {
            console.error("Erro ao atualizar meta:", error);
            throw error;
        }
    }

    /**
     * Deletar uma meta
     * @param {string} id - ID da meta
     * @returns {Promise<void>}
     */
    async function remove(id) {
        try {
            await deleteGoal(id);
            // Remove da lista local
            goals.value = goals.value.filter(g => g._id !== id);
        } catch (error) {
            console.error("Erro ao deletar meta:", error);
            throw error;
        }
    }

    onMounted(() => {
        loadGoals();
    });

    return {
        goals,
        loading,
        loadGoals,
        createNew,
        update,
        remove,
    };
}
