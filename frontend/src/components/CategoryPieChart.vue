<template>
  <div class="relative z-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Gastos por categoria</span>
      <span class="text-xl">📊</span>
    </div>

    <div v-if="hasData" class="flex flex-col items-center gap-4">
      <div class="relative w-40 h-40">
        <canvas ref="chartCanvas" class="w-full! h-full!"></canvas>
      </div>

      <!-- Legend -->
      <ul class="w-full space-y-1.5">
        <li
          v-for="item in breakdown"
          :key="item.category"
          class="flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: categoryColor(item.category) }"></span>
            <span class="text-slate-700 capitalize">{{ item.category }}</span>
          </div>
          <span class="text-slate-500 font-medium">{{ formatCurrency(item.total) }}</span>
        </li>
      </ul>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-8 text-slate-400 text-sm gap-2">
      <span class="text-3xl">🍕</span>
      Sem transações no período
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount, defineExpose } from "vue";
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from "chart.js";
import { getCategoryBreakdown } from "@/services/api";

Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

const props = defineProps({ year: Number, month: Number });

const breakdown = ref([]);
const chartCanvas = ref(null);
let chartInstance = null;

const CATEGORY_COLORS = {
  mercado: "#22c55e",
  combustivel: "#f59e0b",
  lazer: "#8b5cf6",
  saude: "#ef4444",
  outros: "#94a3b8",
};

function categoryColor(cat) {
  return CATEGORY_COLORS[cat] ?? "#94a3b8";
}

const hasData = computed(() => breakdown.value.length > 0);

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildChart() {
  if (!chartCanvas.value || !hasData.value) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: "doughnut",
    data: {
      labels: breakdown.value.map((i) => i.category),
      datasets: [
        {
          data: breakdown.value.map((i) => i.total),
          backgroundColor: breakdown.value.map((i) => categoryColor(i.category)),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      animation: {
        duration: 250,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

async function fetchBreakdown() {
  const data = await getCategoryBreakdown(props.year, props.month);
  breakdown.value = Array.isArray(data) ? data : [];

  if (!breakdown.value.length && chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  await nextTick();
  buildChart();
}

onMounted(fetchBreakdown);
watch(() => [props.year, props.month], fetchBreakdown);
onBeforeUnmount(() => chartInstance?.destroy());

defineExpose({ refetch: fetchBreakdown });
</script>
