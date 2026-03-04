<template>
    <cardBase title="Fatura do cartão">
        {{ invoiceFormatted }}
    </cardBase>
</template>

<script setup>
import { ref, onMounted, computed, defineExpose } from "vue";
import { getCreditCardInvoice } from "@/services/api";
import CardBase from "./CardBase.vue";

const invoice = ref(0);

const invoiceFormatted = computed(() =>
    invoice.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })
);

async function fetchInvoice() {
    const data = await getCreditCardInvoice();
    invoice.value = data.invoice;
}

onMounted(() => {
    fetchInvoice();
});

function refetch() {
    fetchInvoice();
}

defineExpose({
    refetch
});

</script>