<template>
  <CardBase title="Saldo do mês" icon="💰"  >
    <span :class="balance >= 0 ? 'text-green-600' : 'text-red-500'">
      {{ balanceFormatted }}
    </span>
    <template #footer>
      <p class="text-xs text-slate-400">Receitas menos despesas</p>
    </template>
  </CardBase>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineExpose } from "vue";
import { getMonthlyBalance } from "@/services/api";
import CardBase from "./CardBase.vue";

const props = defineProps({ year: Number, month: Number });

const balance = ref(0);

const balanceFormatted = computed(() =>
  balance.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
);

async function fetchBalance() {
  const data = await getMonthlyBalance(props.year, props.month);
  balance.value = data.balance ?? 0;
}

onMounted(fetchBalance);
watch(() => [props.year, props.month], fetchBalance);

defineExpose({ refetch: fetchBalance });
</script>
