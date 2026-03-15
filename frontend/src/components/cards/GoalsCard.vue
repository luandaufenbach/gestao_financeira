<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <button
          @click="prevSlide"
          class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center justify-center transition-colors"
        >
          &#8249;
        </button>
        <button
          @click="nextSlide"
          class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center justify-center transition-colors"
        >
          &#8250;
        </button>
      </div>
      <span class="text-xs font-semibold text-slate-400">{{ activeSlide + 1 }}/2</span>
    </div>

    <div v-if="activeSlide === 0" class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Valor guardado total</span>
        <span class="text-xl">💰</span>
      </div>
      <p class="text-3xl font-bold text-emerald-600">{{ savedFormatted }}</p>
      <p class="text-sm text-slate-400">Histórico acumulado guardado</p>
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Metas</span>
        <RouterLink to="/goals" class="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
          Ver mais
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <div v-if="goals.length" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-800 text-sm truncate mr-2">{{ currentGoal.name }}</span>
          <span class="text-xs text-slate-500 whitespace-nowrap">{{ progressPercent }}%</span>
        </div>

        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: progressPercent + '%', backgroundColor: currentGoal.color || '#22c55e' }"
          ></div>
        </div>

        <div class="flex justify-between text-xs text-slate-400">
          <span>{{ formatCurrency(currentGoal.currentAmount) }}</span>
          <span>{{ formatCurrency(currentGoal.targetAmount) }}</span>
        </div>

        <div class="flex items-center justify-between pt-1">
          <button
            @click="prevGoal"
            class="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Meta anterior
          </button>
          <span class="text-xs text-slate-400">{{ currentIndex + 1 }}/{{ goals.length }}</span>
          <button
            @click="nextGoal"
            class="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Próxima meta
          </button>
        </div>
      </div>

      <div v-else class="text-sm text-slate-400 py-5 text-center">
        Nenhuma meta cadastrada.
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineExpose } from "vue";
import { RouterLink } from "vue-router";
import { getTotalSavedMoney, getGoals } from "@/services/api";

const props = defineProps({ year: Number, month: Number });

const saved = ref(0);
const goals = ref([]);
const activeSlide = ref(0);
const currentIndex = ref(0);

const savedFormatted = computed(() =>
  saved.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
);

const currentGoal = computed(() => goals.value[currentIndex.value] ?? null);

const progressPercent = computed(() => {
  if (!currentGoal.value || currentGoal.value.targetAmount === 0) return 0;
  return Math.min(
    100,
    Math.round((currentGoal.value.currentAmount / currentGoal.value.targetAmount) * 100)
  );
});

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function prevGoal() {
  currentIndex.value = (currentIndex.value - 1 + goals.value.length) % goals.value.length;
}

function nextGoal() {
  currentIndex.value = (currentIndex.value + 1) % goals.value.length;
}

function prevSlide() {
  activeSlide.value = activeSlide.value === 0 ? 1 : 0;
}

function nextSlide() {
  activeSlide.value = activeSlide.value === 1 ? 0 : 1;
}

async function fetchAll() {
  const [savedData, goalsData] = await Promise.all([
    getTotalSavedMoney(),
    getGoals(),
  ]);
  saved.value = savedData.saved ?? 0;
  goals.value = Array.isArray(goalsData) ? goalsData : [];
  currentIndex.value = 0;
}

onMounted(fetchAll);
watch(() => [props.year, props.month], fetchAll);

defineExpose({ refetch: fetchAll });
</script>
