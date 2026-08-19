import { ref, toValue, onMounted, onBeforeUnmount, nextTick } from "vue";

/**
 * Corta uma lista na quantidade de itens que cabe na altura disponível.
 *
 * MOTIVO: no dashboard os cards vivem em linhas de grid, e o grid estica todos
 * os cards da linha até a altura do mais alto. O card mais baixo ficava com um
 * bloco de branco embaixo do conteúdo. Como essa altura só existe em runtime
 * (depende de quantas categorias, faturas ou linhas de saldo o mês tem), não dá
 * para escolher um número fixo de itens no template.
 *
 * A medição é da altura útil do container e da altura real da primeira linha
 * renderizada. Cortar a lista nunca a faz somar mais que o espaço já
 * disponível, então o ResizeObserver converge em vez de se realimentar.
 *
 * @param {import("vue").Ref<HTMLElement|null>} rootRef - card inteiro; é ele
 *   que muda de tamanho quando a linha do grid muda.
 * @param {import("vue").Ref<HTMLElement|null>} listRef - container dos itens,
 *   que deve ocupar a altura livre (flex-1 + min-h-0 + overflow-hidden).
 */
export function useFitToHeight(rootRef, listRef, options = {}) {
	const {
		/** Espaçamento entre os itens, em px (o `gap-*` do container). */
		gap = 8,
		/** Altura de linha usada só no primeiro render, antes de haver o que medir. */
		fallbackRowHeight = 58,
		/** Quantos itens mostrar antes da primeira medição. */
		initial = 5,
		/** Desliga o ajuste (ex.: no mobile, onde o card cresce com o conteúdo). */
		enabled = true,
	} = options;

	const capacity = ref(initial);
	let observer = null;

	function measure() {
		if (!toValue(enabled) || !listRef.value) return;

		const available = listRef.value.clientHeight;
		if (!available) return;

		const rowHeight = listRef.value.firstElementChild?.offsetHeight || fallbackRowHeight;

		// O último item não tem gap depois dele, daí o + gap no numerador.
		capacity.value = Math.max(1, Math.floor((available + gap) / (rowHeight + gap)));
	}

	/** Mede depois que o DOM refletir a mudança (recarga de dados, troca de aba). */
	async function remeasure() {
		await nextTick();
		measure();
	}

	onMounted(async () => {
		await remeasure();

		if (!toValue(enabled) || !rootRef.value) return;

		observer = new ResizeObserver(measure);
		observer.observe(rootRef.value);
	});

	onBeforeUnmount(() => observer?.disconnect());

	return { capacity, measure, remeasure };
}
