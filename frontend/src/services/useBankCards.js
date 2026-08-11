import { ref } from "vue";
import * as api from "./api";

export function useBankCards() {
	const bankCards = ref([]);
	const loading = ref(false);
	const error = ref("");

	async function loadBankCards() {
		loading.value = true;
		error.value = "";

		try {
			const data = await api.getBankCards();
			bankCards.value = Array.isArray(data) ? data : [];
		} catch (err) {
			error.value = err.displayMessage ?? "Erro ao carregar cartões";
			bankCards.value = [];
		} finally {
			loading.value = false;
		}
	}

	async function createNew(payload) {
		const created = await api.createBankCard(payload);
		bankCards.value = [created, ...bankCards.value];
		return created;
	}

	async function remove(id) {
		await api.deleteBankCard(id);
		bankCards.value = bankCards.value.filter((card) => card._id !== id);
	}

	return { bankCards, loading, error, loadBankCards, createNew, remove };
}
