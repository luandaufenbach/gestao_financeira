<template>
  <CardBase title="Fatura do cartão">
    <span :class="invoiceColor">{{ formatted }}</span>
    <template #footer>
      <p class="text-xs text-slate-400">Total de crédito no mês</p>
    </template>
  </CardBase>
</template>

<script setup>
import { computed } from "vue";
import { getCreditCardInvoice } from "@/services/api";
import { useCurrencyCardFetch } from "@/services/useCardFetch";
import { useFormatters } from "@/services/useFormatters";
import CardBase from "./CardBase.vue";

const props = defineProps({ year: Number, month: Number });

const { formatCurrency } = useFormatters();
const { data, formatted, refetch } = useCurrencyCardFetch(
  props,
  getCreditCardInvoice,
  "invoiceInCents",
  formatCurrency
);

// Ver MonthlyBalanceCard: usa o número, não o parse reverso da string (M12).
const invoiceColor = computed(() => (data.value > 0 ? "text-red-500" : "text-green-600"));

defineExpose({ refetch });
</script>
