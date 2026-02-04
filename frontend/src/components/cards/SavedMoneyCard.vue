<template>
    <cardBase title="Valor guardado" icon="🏦">
        {{ savingFormatted }}
    </cardBase>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { getSavedMoney } from "@/services/api";

import CardBase from "./CardBase.vue";

const saving = ref(0);

const savingFormatted = computed(() => {
    return saving.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
});

onMounted(async () => {
    const data = await getSavedMoney();
    saving.value = data.saved;

});

</script>