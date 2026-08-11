<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <button
          type="button"
          aria-label="Painel anterior"
          class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center justify-center transition-colors cursor-pointer"
          @click="prevSlide"
        >
          &#8249;
        </button>
        <button
          type="button"
          aria-label="Próximo painel"
          class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center justify-center transition-colors cursor-pointer"
          @click="nextSlide"
        >
          &#8250;
        </button>
      </div>
      <span class="text-xs font-semibold text-slate-400">{{ activeSlide + 1 }}/2</span>
    </div>

    <div v-if="activeSlide === 0" class="space-y-3">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Valor guardado total
      </span>
      <p class="text-3xl font-bold text-emerald-600">{{ formatCurrency(savedInCents) }}</p>
      <!--
        Era "Histórico acumulado guardado". Com o resgate, o número deixou de
        ser um acumulado que só cresce e passou a ser o saldo real da reserva.
      -->
      <p class="text-sm text-slate-400">Disponível na sua reserva</p>
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Metas</span>
        <RouterLink
          to="/goals"
          class="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          Ver mais
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <div v-if="currentGoal" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-800 text-sm truncate mr-2">{{
            currentGoal.name
          }}</span>
          <span class="text-xs text-slate-500 whitespace-nowrap">{{ progressPercent }}%</span>
        </div>

        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: progressPercent + '%',
              backgroundColor: currentGoal.color || '#22c55e',
            }"
          ></div>
        </div>

        <div class="flex justify-between text-xs text-slate-400">
          <span>{{ formatCurrency(currentGoal.currentAmountInCents) }}</span>
          <span>{{ formatCurrency(currentGoal.targetAmountInCents) }}</span>
        </div>

        <div v-if="goals.length > 1" class="flex items-center justify-between pt-1">
          <button
            type="button"
            class="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            @click="prevGoal"
          >
            Meta anterior
          </button>
          <span class="text-xs text-slate-400">{{ currentIndex + 1 }}/{{ goals.length }}</span>
          <button
            type="button"
            class="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            @click="nextGoal"
          >
            Próxima meta
          </button>
        </div>
      </div>

      <div v-else class="text-sm text-slate-400 py-5 text-center">Nenhuma meta cadastrada.</div>
    </div>

    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { getTotalSavedMoney, getGoals } from "@/services/api";
import { useFormatters } from "@/services/useFormatters";

const { formatCurrency, calculateProgress } = useFormatters();

const savedInCents = ref(0);
const goals = ref([]);
const activeSlide = ref(0);
const currentIndex = ref(0);
const error = ref("");

const currentGoal = computed(() => goals.value[currentIndex.value] ?? null);

const progressPercent = computed(() =>
  currentGoal.value
    ? calculateProgress(
        currentGoal.value.currentAmountInCents,
        currentGoal.value.targetAmountInCents
      )
    : 0
);

// O guard `goals.length > 1` no template evita o módulo por zero que estas
// funções fariam com a lista vazia.
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

async function refetch() {
  error.value = "";

  try {
    // Antes, uma das duas chamadas falhando derrubava as duas sem aviso:
    // fetchAll não tinha try/catch e o erro virava uma promise rejeitada solta.
    const [saved, goalsData] = await Promise.all([getTotalSavedMoney(), getGoals()]);

    savedInCents.value = saved?.savedInCents ?? 0;
    goals.value = Array.isArray(goalsData) ? goalsData : [];
    currentIndex.value = 0;
  } catch (err) {
    error.value = err.displayMessage ?? "Erro ao carregar metas";
  }
}

onMounted(refetch);

defineExpose({ refetch });
</script>
