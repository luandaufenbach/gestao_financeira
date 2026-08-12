<template>
  <CardBase title="Saldo do mês">
    <span :class="balanceColor">{{ formatCurrency(balanceInCents) }}</span>

    <template #footer>
      <!--
        A composição fica visível de propósito: o saldo é o DISPONÍVEL, e
        entender de onde ele vem exige ver as parcelas. Compras no crédito
        aparecem à parte, marcadas como "não sai agora", porque elas não
        afetam este número — só afetam quando a fatura é paga.
      -->
      <dl class="space-y-0.5 text-xs">
        <div v-for="line in lines" :key="line.label" class="flex justify-between text-slate-500">
          <dt>{{ line.label }}</dt>
          <dd class="font-medium" :class="line.color">
            {{ line.sign }} {{ formatCurrency(line.value) }}
          </dd>
        </div>
      </dl>

      <div v-if="creditExpense > 0" class="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
        <div class="flex justify-between text-xs text-slate-400">
          <dt>Compras no crédito</dt>
          <dd class="font-medium">{{ formatCurrency(creditExpense) }}</dd>
        </div>
        <p class="text-[11px] text-slate-400">Não sai agora — entra na fatura do cartão.</p>
      </div>

      <p
        v-if="showNetResult"
        class="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100"
      >
        Receitas menos despesas do mês:
        <span class="font-medium text-slate-500">{{ formatCurrency(netResult) }}</span>
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
  debitExpenseInCents: 0,
  creditExpenseInCents: 0,
  savedInCents: 0,
  withdrawnInCents: 0,
  invoicePaidInCents: 0,
};

// `null` como campo: este card precisa da resposta inteira, não de um número.
const { data: summary, refetch } = useCardFetch(props, getMonthlyBalance, null, EMPTY);

const field = (name) => computed(() => summary.value?.[name] ?? 0);

const balanceInCents = field("balanceInCents");
const creditExpense = field("creditExpenseInCents");
const netResult = field("netResultInCents");

/**
 * Só as linhas que realmente têm valor entram, para o card não virar uma
 * tabela de zeros na maioria dos meses.
 */
const lines = computed(() => {
  const s = summary.value ?? EMPTY;

  return [
    { label: "Receitas", value: s.incomeInCents, sign: "+", color: "text-emerald-600" },
    { label: "Despesas no débito", value: s.debitExpenseInCents, sign: "−", color: "text-red-500" },
    { label: "Guardado", value: s.savedInCents, sign: "−", color: "text-blue-500" },
    { label: "Resgatado", value: s.withdrawnInCents, sign: "+", color: "text-sky-600" },
    { label: "Fatura paga", value: s.invoicePaidInCents, sign: "−", color: "text-amber-600" },
  ].filter((line, index) => index === 0 || line.value > 0);
});

/** Só faz sentido mostrar quando difere do saldo. */
const showNetResult = computed(() => netResult.value !== balanceInCents.value);

/**
 * BUG CORRIGIDO (M12): a versão anterior descobria o sinal do saldo fazendo
 * parse reverso da string já formatada. O número puro sempre esteve na resposta.
 */
const balanceColor = computed(() =>
  balanceInCents.value >= 0 ? "text-green-600" : "text-red-500"
);

defineExpose({ refetch });
</script>
