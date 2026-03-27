<script setup>
import { computed, defineExpose } from "vue";
import { getCreditCardInvoice } from "@/services/api";
import { useCardFetch } from "@/services/useCardFetch";
import { useFormatters } from "@/services/useFormatters";
import CardBase from "./CardBase.vue";

const props = defineProps({ year: Number, month: Number });

const { formatCurrency } = useFormatters();
const { formatted, refetch } = useCardFetch(props, getCreditCardInvoice, formatCurrency);

defineExpose({ refetch });

const invoiceColor = computed(() => {
    const val = Number(formatted.value.replace(/[^\d,-]/g, '').replace(',', '.'));
    return val > 0 ? "text-red-500" : "text-green-600";
});
</script>

<template>
    <CardBase title="Fatura do cartão" icon="💳">
        <span :class="invoiceColor">{{ formatted }}</span>
        <template #footer>
            <p class="text-xs text-slate-400">Total de crédito no mês</p>
        </template>
    </CardBase>
</template>