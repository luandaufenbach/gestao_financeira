<template>
  <div
    ref="root"
    class="md:h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4"
  >
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

    <div v-if="activeSlide === 0" class="flex flex-col gap-3 md:flex-1 md:min-h-0">
      <div class="space-y-1">
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

      <!--
        Os depósitos preenchem o espaço que sobrava embaixo do total: o card é
        o mais baixo da linha do grid e era esticado até a altura do saldo do
        mês, ficando com um bloco de branco. Quantos cabem é medido em runtime.
      -->
      <div v-if="deposits.length" class="flex flex-col gap-2 md:flex-1 md:min-h-0">
        <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Depósitos recentes
        </span>

        <ul ref="depositList" class="flex flex-col gap-2 md:flex-1 md:min-h-0 md:overflow-hidden">
          <li
            v-for="deposit in visibleDeposits"
            :key="deposit._id"
            class="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">
                {{ deposit.description }}
              </p>
              <p class="text-xs text-slate-400">
                {{ formatDate(deposit.date) }}
                <template v-if="deposit.goal"> · {{ deposit.goal.name }}</template>
              </p>
            </div>
            <span class="text-sm font-semibold text-blue-600 whitespace-nowrap">
              + {{ formatCurrency(deposit.valueInCents) }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="flex flex-col gap-3 md:flex-1 md:min-h-0">
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

      <!--
        Antes só uma meta aparecia por vez, com botões "meta anterior/próxima".
        Agora a lista mostra todas as que couberem na altura do card — o mesmo
        espaço em branco que os depósitos resolvem no outro painel.
      -->
      <ul
        v-if="goals.length"
        ref="goalList"
        class="flex flex-col gap-2 md:flex-1 md:min-h-0 md:overflow-hidden"
      >
        <li
          v-for="goal in visibleGoals"
          :key="goal._id"
          class="rounded-xl border border-slate-100 px-3 py-2 space-y-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-slate-800 text-sm truncate">{{ goal.name }}</span>
            <span class="text-xs text-slate-500 whitespace-nowrap">{{ percentOf(goal) }}%</span>
          </div>

          <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: percentOf(goal) + '%',
                backgroundColor: goal.color || '#22c55e',
              }"
            ></div>
          </div>

          <div class="flex justify-between text-xs text-slate-400">
            <span>{{ formatCurrency(goal.currentAmountInCents) }}</span>
            <span>{{ formatCurrency(goal.targetAmountInCents) }}</span>
          </div>
        </li>
      </ul>

      <div v-else class="text-sm text-slate-400 py-5 text-center">Nenhuma meta cadastrada.</div>
    </div>

    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, useTemplateRef } from "vue";
import { RouterLink } from "vue-router";
import { getTotalSavedMoney, getGoals, getTransactions } from "@/services/api";
import { useFormatters } from "@/services/useFormatters";
import { useFitToHeight } from "@/services/useFitToHeight";

const { formatCurrency, formatDate, calculateProgress } = useFormatters();

const savedInCents = ref(0);
const goals = ref([]);
const deposits = ref([]);
const activeSlide = ref(0);
const error = ref("");

/** Teto do que é buscado; o que aparece é o que couber na altura do card. */
const DEPOSITS_LIMIT = 15;

const rootEl = useTemplateRef("root");
const depositListEl = useTemplateRef("depositList");
const goalListEl = useTemplateRef("goalList");

const depositsFit = useFitToHeight(rootEl, depositListEl, { initial: 3, fallbackRowHeight: 54 });
const goalsFit = useFitToHeight(rootEl, goalListEl, { initial: 2, fallbackRowHeight: 74 });

const visibleDeposits = computed(() => deposits.value.slice(0, depositsFit.capacity.value));
const visibleGoals = computed(() => goals.value.slice(0, goalsFit.capacity.value));

const percentOf = (item) => calculateProgress(item.currentAmountInCents, item.targetAmountInCents);

function prevSlide() {
  activeSlide.value = activeSlide.value === 0 ? 1 : 0;
}

function nextSlide() {
  activeSlide.value = activeSlide.value === 1 ? 0 : 1;
}

async function refetch() {
  error.value = "";

  try {
    // Antes, qualquer uma das chamadas falhando derrubava as outras sem aviso:
    // fetchAll não tinha try/catch e o erro virava uma promise rejeitada solta.
    const [saved, goalsData, depositsData] = await Promise.all([
      getTotalSavedMoney(),
      getGoals(),
      // Só os depósitos: o resgate é o caminho inverso e já aparece no card de
      // saldo do mês. Sem year/month, são os mais recentes de todo o histórico.
      getTransactions({ type: "savings", limit: DEPOSITS_LIMIT }),
    ]);

    savedInCents.value = saved?.savedInCents ?? 0;
    goals.value = Array.isArray(goalsData) ? goalsData : [];
    deposits.value = Array.isArray(depositsData) ? depositsData : [];
  } catch (err) {
    error.value = err.displayMessage ?? "Erro ao carregar metas";
  }
}

// Cada painel tem a sua lista. Ao trocar de painel — ou quando os dados
// chegam — a lista visível acabou de entrar no DOM e ainda não foi medida.
watch([activeSlide, deposits, goals], () => {
  depositsFit.remeasure();
  goalsFit.remeasure();
});

onMounted(refetch);

defineExpose({ refetch });
</script>
