import { ref, computed, onMounted, watch, toValue } from "vue";

/**
 * Busca de dados para os cards do dashboard.
 *
 * BUGS CORRIGIDOS:
 *
 * 1. (A10) A versão anterior importava `defineExpose` de "vue" e o chamava
 *    aqui dentro. defineExpose é uma macro de compilador que só funciona em
 *    <script setup>: importar é deprecado e a chamada fora do setup é um
 *    no-op. Só parecia funcionar porque cada card chamava defineExpose de novo
 *    por conta própria. Agora o composable apenas devolve `refetch`, e o card
 *    decide se expõe.
 *
 * 2. (M11) O resultado era lido com `Object.keys(result)[0]`, adivinhando o
 *    nome do campo. Se o backend devolvesse `{error: "..."}`, o card exibia a
 *    string do erro como se fosse o valor. Agora o campo é declarado.
 *
 * 3. (A5) O `watch` recriava a busca a cada mudança de mês E o Dashboard
 *    chamava refetch() manualmente logo em seguida, resultando em duas
 *    requisições por card a cada clique. O Dashboard deixou de chamar
 *    refetch(); o watch aqui é a única fonte de recarga.
 *
 * @param {object} props - Deve conter `year` e `month`.
 * @param {Function} fetchFunction - (year, month) => Promise<object>
 * @param {string|null} field - Campo a extrair da resposta, ou `null` para
 *   receber o objeto inteiro.
 * @param {*} initialValue
 */
export function useCardFetch(props, fetchFunction, field, initialValue = 0) {
	const data = ref(initialValue);
	const loading = ref(false);
	const error = ref("");

	// Descarta respostas de requisições antigas que chegarem fora de ordem
	// (o usuário clicando rápido entre meses).
	let requestId = 0;

	async function refetch() {
		const currentRequest = ++requestId;

		loading.value = true;
		error.value = "";

		try {
			const result = await fetchFunction(toValue(props.year), toValue(props.month));

			if (currentRequest !== requestId) return;

			// `field: null` entrega a resposta inteira — para cards que precisam
			// de mais de um número (ex.: o saldo com sua composição).
			data.value =
				field === null ? (result ?? initialValue) : (result?.[field] ?? initialValue);
		} catch (err) {
			if (currentRequest !== requestId) return;

			error.value = err.displayMessage ?? "Erro ao carregar";
			data.value = initialValue;
		} finally {
			if (currentRequest === requestId) loading.value = false;
		}
	}

	onMounted(refetch);
	watch(() => [props.year, props.month], refetch);

	return { data, loading, error, refetch };
}

/**
 * Variante que já devolve o valor formatado como moeda.
 * `data` continua disponível como número, para quem precisa comparar.
 */
export function useCurrencyCardFetch(props, fetchFunction, field, formatCurrency) {
	const state = useCardFetch(props, fetchFunction, field, 0);

	return {
		...state,
		formatted: computed(() => formatCurrency(state.data.value)),
	};
}
