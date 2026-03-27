/**
 * Composable para centralizar a lógica de fetch de dados em cards
 * Padrão: ref, computed, onMounted, watch, defineExpose
 * 
 * Uso:
 * const { data, refetch } = useCardFetch(props, getMonthlyBalance)
 */
import { ref, onMounted, watch, computed, defineExpose } from "vue";

export function useCardFetch(props, fetchFunction, formatFunction = null, initialValue = 0) {
    const data = ref(initialValue);
    const loading = ref(false);

    /**
     * Formata o valor exibido (ex: para moeda)
     * Se nenhuma função de formatação for passada, retorna o valor como está
     */
    const formatted = computed(() => {
        return formatFunction ? formatFunction(data.value) : data.value;
    });

    /**
     * Busca os dados chamando a função passada com year/month
     */
    async function refetch() {
        try {
            loading.value = true;
            const result = await fetchFunction(props.year, props.month);

            // Detecta automaticamente qual propriedade do resultado usar
            // Funciona com { balance }, { invoice }, { saved }, etc
            if (result) {
                const keys = Object.keys(result);
                data.value = result[keys[0]] ?? initialValue;
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            data.value = initialValue;
        } finally {
            loading.value = false;
        }
    }

    // Carrega na montagem
    onMounted(refetch);

    // Recarrega quando year/month mudam
    watch(() => [props.year, props.month], refetch);

    // Expõe para o componente pai recarregar se necessário
    defineExpose({ refetch });

    return {
        data,
        formatted,
        loading,
        refetch,
    };
}
