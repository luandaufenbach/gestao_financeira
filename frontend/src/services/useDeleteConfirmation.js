/**
 *   para gerenciar modal de confirmação de exclusão
 * Reutilizável em qualquer view/componente que precisar deletar items
 */
import { ref } from "vue";

export function useDeleteConfirmation(removeFunction) {
    const showModal = ref(false);
    const selectedId = ref(null);

    /**
     * Abre o modal de confirmação para um item específico
     * @param {string} id - ID do item a deletar
     */
    function open(id) {
        selectedId.value = id;
        showModal.value = true;
    }

    /**
     * Fecha o modal sem fazer nada
     */
    function close() {
        showModal.value = false;
        selectedId.value = null;
    }

    /**
     * Confirma a exclusão do item selecionado
     */
    async function confirm() {
        try {
            await removeFunction(selectedId.value);
            showModal.value = false;
            selectedId.value = null;
        } catch (error) {
            console.error("Erro ao deletar:", error);
            throw error;
        }
    }

    return {
        showModal,
        selectedId,
        open,
        close,
        confirm,
    };
}
