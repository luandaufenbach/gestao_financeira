<template>
  <div
    class="relative z-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 overflow-hidden"
  >
    <span class="text-xs font-semibold uppercase tracking-widest text-slate-400"
      >Gastos por categoria</span
    >

    <div v-if="hasData" class="flex flex-col items-center gap-4">
      <div class="relative w-40 h-40">
        <canvas
          ref="chartCanvas"
          class="w-full! h-full!"
          role="img"
          :aria-label="`Gráfico de gastos por categoria. ${ariaSummary}`"
        ></canvas>
      </div>

      <ul class="w-full space-y-1.5">
        <li
          v-for="item in breakdown"
          :key="item.categoryId ?? item.category"
          class="flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full shrink-0"
              :style="{ backgroundColor: item.color }"
            ></span>
            <span class="text-slate-700">{{ item.category }}</span>
          </div>
          <span class="text-slate-500 font-medium">{{ formatCurrency(item.totalInCents) }}</span>
        </li>
      </ul>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-8 text-slate-400 text-sm gap-2">
      <span class="text-3xl" aria-hidden="true">🍕</span>
      {{ error || "Sem transações no período" }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import { Chart, ArcElement, DoughnutController, Tooltip } from "chart.js";
import { getCategoryBreakdown } from "@/services/api";
import { useFormatters } from "@/services/useFormatters";

/**
 * Registro apenas dos módulos usados — o `Legend` estava registrado mas
 * desativado nas options (`legend: { display: false }`), já que a legenda é
 * renderizada em HTML logo abaixo. Removê-lo reduz o bundle.
 */
Chart.register(ArcElement, DoughnutController, Tooltip);

const props = defineProps({ year: Number, month: Number });

const { formatCurrency } = useFormatters();

const breakdown = ref([]);
const error = ref("");
const chartCanvas = ref(null);
let chartInstance = null;

const hasData = computed(() => breakdown.value.length > 0);

/**
 * As cores agora vêm sempre do backend, que já aplica um padrão via $ifNull
 * na agregação. O mapa CATEGORY_COLORS local, com nomes fixos em minúsculas
 * ("mercado", "combustivel"), foi removido: ele nunca casava com os nomes
 * reais cadastrados pelo usuário e servia só como fallback morto.
 */
const ariaSummary = computed(() =>
  breakdown.value.map((i) => `${i.category}: ${formatCurrency(i.totalInCents)}`).join(", ")
);

function destroyChart() {
  chartInstance?.destroy();
  chartInstance = null;
}

function buildChart() {
  if (!chartCanvas.value || !hasData.value) return;

  destroyChart();

  chartInstance = new Chart(chartCanvas.value, {
    type: "doughnut",
    data: {
      labels: breakdown.value.map((i) => i.category),
      datasets: [
        {
          data: breakdown.value.map((i) => i.totalInCents),
          backgroundColor: breakdown.value.map((i) => i.color),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            // O dataset está em centavos; formatCurrency faz a conversão.
            label: (ctx) => ` ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

async function refetch() {
  error.value = "";

  try {
    const data = await getCategoryBreakdown(props.year, props.month);
    breakdown.value = Array.isArray(data) ? data : [];
  } catch (err) {
    // Antes, esta função não tinha try/catch: uma falha na requisição virava
    // uma promise rejeitada solta e o gráfico ficava congelado no mês anterior.
    error.value = err.displayMessage ?? "Erro ao carregar o gráfico";
    breakdown.value = [];
  }

  if (!hasData.value) {
    destroyChart();
    return;
  }

  await nextTick();
  buildChart();
}

onMounted(refetch);
watch(() => [props.year, props.month], refetch);
onBeforeUnmount(destroyChart);

defineExpose({ refetch });
</script>
