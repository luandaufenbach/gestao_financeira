<template>
    <cardBase title="Saldo do mês" icon="💰">
        {{ balanceFormatted }}
    </cardBase>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { getMonthlyBalance } from "@/services/api";


import cardBase from './CardBase.vue';

const balance = ref(0);

const balanceFormatted = computed(() => {
    return balance.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
});

onMounted(async () => {
    const data = await getMonthlyBalance();
    balance.value = data.balance;
});

</script>