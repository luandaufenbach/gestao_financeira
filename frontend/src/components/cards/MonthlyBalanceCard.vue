<template>
    <cardBase title="Saldo do mês">
        {{ balanceFormatted }}
    </cardBase>
</template>

<script setup>
import { ref, onMounted, computed, defineExpose } from "vue";
import { getMonthlyBalance } from "@/services/api";


import cardBase from './CardBase.vue';

const balance = ref(0);

const balanceFormatted = computed(() => {
    return balance.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
});

async function fetchBalance() {
    const data = await getMonthlyBalance();
    balance.value = data.balance;
}

onMounted(() => {
    fetchBalance();
});

function refetch() {
    fetchBalance();
}

defineExpose({
    refetch
});

</script>