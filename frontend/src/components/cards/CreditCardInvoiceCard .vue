<template>
    <cardBase title="Fatura do cartão" icon="💳">
        {{ invoiceFormatted }}
    </cardBase>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { getCreditCardInvoice } from "@/services/api";
import CardBase from "./CardBase.vue";

const invoice = ref(0);

const invoiceFormatted = computed(() =>
    invoice.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })
);

onMounted(async () => {
    const data = await getCreditCardInvoice();
    invoice.value = data.invoice;
});

</script>