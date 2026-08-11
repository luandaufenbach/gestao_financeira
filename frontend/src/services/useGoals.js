import { ref } from "vue";
import * as api from "./api";

/**
 * Composable de metas.
 *
 * Assim como em useTransactions, o `onMounted` embutido foi removido: quem usa
 * decide quando carregar. Antes, Goals.vue acabava disparando duas requisições
 * — uma pelo onMounted interno do composable e outra pelo onMounted da view.
 */
export function useGoals() {
	const goals = ref([]);
	const loading = ref(false);
	const error = ref("");

	async function loadGoals() {
		loading.value = true;
		error.value = "";

		try {
			const data = await api.getGoals();
			goals.value = Array.isArray(data) ? data : [];
		} catch (err) {
			error.value = err.displayMessage ?? "Erro ao carregar metas";
			goals.value = [];
		} finally {
			loading.value = false;
		}
	}

	async function createNew(payload) {
		const created = await api.createGoal(payload);
		goals.value = [created, ...goals.value];
		return created;
	}

	async function update(id, payload) {
		const updated = await api.updateGoal(id, payload);
		const index = goals.value.findIndex((goal) => goal._id === id);
		if (index !== -1) goals.value[index] = updated;
		return updated;
	}

	async function remove(id) {
		await api.deleteGoal(id);
		goals.value = goals.value.filter((goal) => goal._id !== id);
	}

	return { goals, loading, error, loadGoals, createNew, update, remove };
}
