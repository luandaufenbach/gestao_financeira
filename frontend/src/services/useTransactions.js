import { ref } from "vue";
import * as api from "./api";

/**
 * Composable de transações.
 *
 * Mudanças em relação à versão anterior:
 *
 * 1. Não há mais `onMounted` embutido. Antes, só de chamar o composable o
 *    componente disparava uma requisição, mesmo quando só precisava da função
 *    `update` (era o caso do EditTransactionModal, que buscava a lista inteira
 *    sem nunca usá-la).
 *
 * 2. `createNew` não faz mais push() no array local. Como o backend ordena por
 *    data e aplica o parcelamento, o resultado local ficava fora de ordem e
 *    incompleto. Agora recarregamos a partir da fonte da verdade.
 *
 * 3. Erros de HTTP agora chegam de verdade aqui (ver services/http.js — bug A1)
 *    e são expostos em `error` para a interface mostrar.
 */
export function useTransactions() {
	const transactions = ref([]);
	const loading = ref(false);
	const error = ref("");

	async function loadTransactions(params = {}) {
		loading.value = true;
		error.value = "";

		try {
			const data = await api.getTransactions(params);
			transactions.value = Array.isArray(data) ? data : [];
		} catch (err) {
			error.value = err.displayMessage ?? "Erro ao carregar transações";
			transactions.value = [];
		} finally {
			loading.value = false;
		}
	}

	/** Lança ApiError em caso de falha — o chamador trata e exibe. */
	async function createNew(payload) {
		return api.createTransaction(payload);
	}

	async function update(id, payload) {
		return api.updateTransaction(id, payload);
	}

	/**
	 * @param {"single"|"group"} scope - "group" apaga todas as parcelas.
	 *   Padrão "single": o usuário precisa pedir explicitamente pelo grupo (C3).
	 */
	async function remove(id, scope = "single") {
		const result = await api.deleteTransaction(id, scope);
		transactions.value = transactions.value.filter((t) => t._id !== id);
		return result;
	}

	return { transactions, loading, error, loadTransactions, createNew, update, remove };
}
