import { ref, computed } from "vue";
import * as api from "../services/api";

/**
 * Store de categorias — singleton.
 *
 * BUG CORRIGIDO (A6): o composable anterior (useCategories) declarava
 * `const categories = ref([])` DENTRO da função. Como ele era chamado em
 * quatro lugares (Transactions.vue, CategoriesModal, NewTransactionalModal e
 * EditTransactionModal), cada um recebia uma lista própria e disparava seu
 * próprio GET /categories.
 *
 * O sintoma visível: criar uma categoria no modal não atualizava o <select>
 * da tela atrás dele — a categoria nova só aparecia após recarregar a página.
 *
 * Movendo o estado para fora da função, todos passam a compartilhar a mesma
 * lista, e uma única requisição atende a aplicação inteira.
 */
const categories = ref([]);
const loading = ref(false);
const error = ref("");

// Evita que quatro componentes montando ao mesmo tempo disparem quatro GETs.
let inFlight = null;

async function load({ force = false } = {}) {
	if (!force && (categories.value.length > 0 || inFlight)) {
		return inFlight ?? categories.value;
	}

	loading.value = true;
	error.value = "";

	inFlight = api
		.getCategories()
		.then((data) => {
			categories.value = Array.isArray(data) ? data : [];
			return categories.value;
		})
		.catch((err) => {
			error.value = err.displayMessage ?? "Erro ao carregar categorias";
			categories.value = [];
			throw err;
		})
		.finally(() => {
			loading.value = false;
			inFlight = null;
		});

	return inFlight;
}

async function create(payload) {
	const created = await api.createCategory(payload);
	categories.value = [...categories.value, created].sort((a, b) =>
		a.name.localeCompare(b.name, "pt")
	);
	return created;
}

async function remove(id) {
	await api.deleteCategory(id);
	categories.value = categories.value.filter((category) => category._id !== id);
}

/** Limpa o cache no logout, para não vazar dados entre contas. */
function reset() {
	categories.value = [];
	error.value = "";
	inFlight = null;
}

export function useCategories() {
	/** Mapa id -> categoria, para resolver o nome/cor sem varrer a lista. */
	const byId = computed(
		() => new Map(categories.value.map((category) => [category._id, category]))
	);

	return { categories, loading, error, byId, load, create, remove, reset };
}
