<template>
    <cardBase title="Valor guardado">
        {{ savingFormatted }}
    </cardBase>
</template>

<script setup>
import { ref, onMounted, computed, defineExpose } from "vue";
import { getSavedMoney } from "@/services/api";

import CardBase from "./CardBase.vue";

const saving = ref(0);

const savingFormatted = computed(() => {
    return saving.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
});

async function fetchSaved() {
    const data = await getSavedMoney();
    saving.value = data.saved;
}

onMounted(() => {
    fetchSaved();
});

function refetch() {
    fetchSaved();
}

defineExpose({
    refetch
});

</script>