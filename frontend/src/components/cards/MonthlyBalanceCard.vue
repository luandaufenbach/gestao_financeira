<template>
  <CardBase title="Saldo do mês">
    <span :class="balanceColor">{{ formatCurrency(balanceInCents) }}</span>

    <template #footer>
      <!--
        A composição fica visível de propósito.

        Como o valor guardado passou a ser subtraído do saldo, o número sozinho
        não distingue "guardei 200" de "gastei 200". Mostrar as parcelas devolve
        essa informação sem exigir outro card.
      -->
      <dl class="space-y-0.5 text-xs">
        <div class="flex justify-between text-slate-500">
          <dt>Receitas</dt>
          <dd class="font-medium text-emerald-600">
            + {{ formatCurrency(summary.incomeInCents) }}
          </dd>
        </div>
        <div class="flex justify-between text-slate-500">
          <dt>Despesas</dt>
          <dd class="font-medium text-red-500">− {{ formatCurrency(summary.expenseInCents) }}</dd>
        </div>
        <div v-if="summary.savedInCents > 0" class="flex justify-between text-slate-500">
          <dt>Guardado</dt>
          <dd class="font-medium text-blue-500">− {{ formatCurrency(summary.savedInCents) }}</dd>
        </div>
        <div v-if="summary.withdrawnInCents > 0" class="flex justify-between text-slate-500">
          <dt>Resgatado</dt>
          <dd class="font-medium text-sky-600">+ {{ formatCurrency(summary.withdrawnInCents) }}</dd>
        </div>
      </dl>

      <p
        v-if="hasReserveMovement"
        class="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100"
      >
        Sem contar a reserva, o mês fechou em
        <span class="font-medium text-slate-500">{{
          formatCurrency(summary.netResultInCents)
        }}</span>
      </p>
    </template>
  </CardBase>
</template>

<script setup>
import { computed } from "vue";
import { getMonthlyBalance } from "@/services/api";
import { useCardFetch } from "@/services/useCardFetch";
import { useFormatters } from "@/services/useFormatters";
import CardBase from "./CardBase.vue";

const props = defineProps({ year: Number, month: Number });

const { formatCurrency } = useFormatters();

const EMPTY = {
  balanceInCents: 0,
  netResultInCents: 0,
  incomeInCents: 0,
  expenseInCents: 0,
  savedInCents: 0,
  withdrawnInCents: 0,
};

// `null` como campo: este card precisa da resposta inteira, não de um número.
const { data: summary, refetch } = useCardFetch(props, getMonthlyBalance, null, EMPTY);

const balanceInCents = computed(() => summary.value?.balanceInCents ?? 0);

// A nota de rodapé só faz sentido quando houve movimento na reserva; sem isso
// o saldo e o resultado do mês seriam o mesmo número repetido.
const hasReserveMovement = computed(
  () => (summary.value?.savedInCents ?? 0) > 0 || (summary.value?.withdrawnInCents ?? 0) > 0
);

/**
 * BUG CORRIGIDO (M12): a versão anterior descobria o sinal do saldo fazendo
 * parse reverso da string já formatada:
 *   Number(formatted.value.replace(/[^\d,-]/g, '').replace(',', '.'))
 * Isso funcionava por acaso e quebrava com qualquer mudança de locale.
 * O número puro sempre esteve disponível na resposta.
 */
const balanceColor = computed(() =>
  balanceInCents.value >= 0 ? "text-green-600" : "text-red-500"
);

defineExpose({ refetch });
</script>
