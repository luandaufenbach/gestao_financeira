<template>
    <cardBase title="Valor guardado">
        {{ formatted }}
    </cardBase>
</template>

<script setup>
import { defineExpose } from "vue";
import { getSavedMoney } from "@/services/api";
import { useCardFetch } from "@/services/useCardFetch";
import { useFormatters } from "@/services/useFormatters";
import CardBase from "./CardBase.vue";

const props = defineProps({
    year: Number,
    month: Number,
});

const { formatCurrency } = useFormatters();
const { formatted, refetch } = useCardFetch(props, getSavedMoney, formatCurrency);

defineExpose({ refetch });
</script>