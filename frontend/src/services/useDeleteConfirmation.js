import { ref } from "vue";

/**
 * Estado do diálogo de confirmação de exclusão.
 *
 * Use junto com components/ConfirmDialog.vue. Antes, o markup do diálogo estava
 * duplicado em quatro arquivos e este composable era usado em apenas dois (M2).
 */
export function useDeleteConfirmation(removeFunction) {
	const isOpen = ref(false);
	const selected = ref(null);
	const busy = ref(false);
	const error = ref("");

	/** @param {*} item - Id ou objeto inteiro, conforme o que removeFunction espera. */
	function open(item) {
		selected.value = item;
		error.value = "";
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
		selected.value = null;
		busy.value = false;
	}

	async function confirm() {
		if (selected.value === null) return;

		busy.value = true;
		error.value = "";

		try {
			await removeFunction(selected.value);
			close();
		} catch (err) {
			// Mantém o diálogo aberto e mostra o motivo — é o caso de tentar
			// excluir uma categoria em uso, que o backend recusa com 409.
			error.value = err.displayMessage ?? "Não foi possível excluir.";
			busy.value = false;
		}
	}

	return { isOpen, selected, busy, error, open, close, confirm };
}
