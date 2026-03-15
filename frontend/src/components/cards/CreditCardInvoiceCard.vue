<template>
    <CardBase title="Fatura do cartão" icon="💳">
        <span class="text-red-500">{{ invoiceFormatted }}</span>
        <template #footer>
            <p class="text-xs text-slate-400">Total de crédito no mês</p>
        </template>
    </CardBase>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineExpose } from "vue";
import { getCreditCardInvoice } from "@/services/api";
import CardBase from "./CardBase.vue";

const props = defineProps({ year: Number, month: Number });

const invoice = ref(0);

const invoiceFormatted = computed(() =>
    invoice.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
);

async function fetchInvoice() {
    const data = await getCreditCardInvoice(props.year, props.month);
    invoice.value = data.invoice ?? 0;
}

onMounted(fetchInvoice);
watch(() => [props.year, props.month], fetchInvoice);

defineExpose({ refetch: fetchInvoice });
</script>