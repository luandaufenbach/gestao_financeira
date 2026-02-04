<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-lg font-bold">Transações</h2>

      <div class="flex items-center gap-3">
        <button
          @click="loadTransactions"
          :disabled="loading"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? "Carregando..." : "Buscar transações" }}
        </button>
        <span v-if="error" class="text-sm text-red-700">{{ error }}</span>
      </div>
    </div>

    <p v-if="!loading && !error && transactions.length === 0" class="mt-4 text-sm text-slate-500">
      Nenhuma transação encontrada.
    </p>

    <ul v-else class="mt-4 grid gap-3">
      <li
        v-for="t in transactions"
        :key="t._id"
        class="rounded-lg border border-slate-200 p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="font-semibold text-slate-900">{{ t.description }}</p>
          <p
            class="whitespace-nowrap font-semibold"
            :class="t.type === 'credit' ? 'text-emerald-700' : 'text-red-700'"
          >
            {{ t.type === 'credit' ? "+" : "-" }} {{ formatCurrency(t.value) }}
          </p>
        </div>
        <p class="mt-1 text-xs text-slate-500">{{ formatDate(t.date) }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

const transactions = ref([]);
const loading = ref(false);
const error = ref("");

const loadTransactions = async () => {
  loading.value = true;
  error.value = "";

  try {
    const response = await axios.get(`${API_BASE_URL}/transactions`);
    transactions.value = Array.isArray(response.data) ? response.data : [];
  } catch (e) {
    error.value = "Falha ao buscar transações. O backend está rodando?";
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Number(value || 0));
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("pt-BR");
};
</script>