<script setup>
import { computed, defineExpose } from "vue";
import { getMonthlyBalance } from "@/services/api";
import { useCardFetch } from "@/services/useCardFetch";
import { useFormatters } from "@/services/useFormatters";
import CardBase from "./CardBase.vue";

const props = defineProps({ year: Number, month: Number });

const { formatCurrency } = useFormatters();
const { formatted, refetch } = useCardFetch(props, getMonthlyBalance, formatCurrency);

defineExpose({ refetch });

const balanceColor = computed(() => {
  const val = Number(formatted.value.replace(/[^\d,-]/g, '').replace(',', '.'));
  return val >= 0 ? "text-green-600" : "text-red-500";
});
</script>

<template>
  <CardBase title="Saldo do mês" icon="💰">
    <span :class="balanceColor">
      {{ formatted }}
    </span>
    <template #footer>
      <p class="text-xs text-slate-400">Receitas menos despesas</p>
    </template>
  </CardBase>
</template>
