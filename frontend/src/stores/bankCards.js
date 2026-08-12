import { ref, computed } from "vue";
import * as api from "../services/api";

/**
 * Store de cartões — singleton, pelo mesmo motivo da store de categorias.
 *
 * O formulário de transação, o card de Faturas e a lista "Meus cartões" olham
 * para a mesma lista: cadastrar um cartão em um lugar o disponibiliza nos
 * outros sem recarregar a página, e um único GET atende os três.
 */
const cards = ref([]);
const loading = ref(false);
const error = ref("");

let inFlight = null;

async function load({ force = false } = {}) {
	if (!force && (cards.value.length > 0 || inFlight)) {
		return inFlight ?? cards.value;
	}

	loading.value = true;
	error.value = "";

	inFlight = api
		.getBankCards()
		.then((data) => {
			cards.value = Array.isArray(data) ? data : [];
			return cards.value;
		})
		.catch((err) => {
			error.value = err.displayMessage ?? "Erro ao carregar cartões";
			cards.value = [];
			throw err;
		})
		.finally(() => {
			loading.value = false;
			inFlight = null;
		});

	return inFlight;
}

async function create(payload) {
	const created = await api.createBankCard(payload);
	cards.value = [...cards.value, created];
	return created;
}

async function remove(id) {
	await api.deleteBankCard(id);
	cards.value = cards.value.filter((card) => card._id !== id);
}

/** Limpa o cache no logout, para não vazar dados entre contas. */
function reset() {
	cards.value = [];
	error.value = "";
	inFlight = null;
}

export function useBankCards() {
	const creditCards = computed(() => cards.value.filter((card) => card.type === "credit"));

	return { cards, creditCards, loading, error, load, create, remove, reset };
}
