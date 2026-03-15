<template>
  <div class="min-h-screen bg-slate-50">
    <Navbar />

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <nav class="inline-flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
        <RouterLink to="/dashboard"
          class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          Dashboard
        </RouterLink>
        <RouterLink to="/transactions"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-slate-900 shadow-sm">
          Transações
        </RouterLink>
        <RouterLink to="/goals"
          class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          Metas
        </RouterLink>
      </nav>

      <div class="flex flex-wrap items-center gap-3">
        <select v-model="selectedMonth"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm">
          <option v-for="m in 12" :key="m" :value="m">{{ MONTH_NAMES[m - 1] }}</option>
        </select>
        <select v-model="selectedYear"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model="typeFilter"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm">
          <option value="all">Todos</option>
          <option value="income">Receita</option>
          <option value="debit">Despesa</option>
          <option value="credit">Crédito</option>
          <option value="savings">Guardado</option>
        </select>
        <select v-model="categoryFilter"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm">
          <option value="all">Todas</option>
          <option value="mercado">Mercado</option>
          <option value="combustivel">Combustível</option>
          <option value="lazer">Lazer</option>
          <option value="saude">Saúde</option>
          <option value="outros">Outros</option>
        </select>

        <button @click="showModal = true"
          class="ml-auto group inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200">
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none">+</span>
          Nova
        </button>
      </div>

      <section class="space-y-3">
        <h2 class="text-slate-500 text-xl font-bold tracking-wide">TRANSAÇÕES ({{ filteredTransactions.length }})</h2>

        <div v-for="t in filteredTransactions" :key="t._id"
          class="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-sm">
          <div class="min-w-0">
            <p class="text-xl font-semibold text-slate-800 truncate">{{ t.description }}</p>
            <p class="text-slate-400 text-lg truncate">
              {{ formatCategory(t.category) }} · {{ formatType(t.type) }} · {{ formatDate(t.date) }}
              <span v-if="t.installment?.total > 1" class="ml-2 text-blue-600 font-semibold">
                {{ t.installment.current }}/{{ t.installment.total }}
              </span>
            </p>
          </div>

          <div class="flex items-center gap-4 shrink-0">
            <span class="text-3xl font-bold" :class="amountColor(t.type)">
              {{ formatCurrency(t.value) }}
            </span>
            <button @click="startEdit(t)" class="text-slate-400 hover:text-slate-600 transition-colors"
              title="Editar">✎</button>
            <button @click="openDeleteModal(t._id)" class="text-slate-400 hover:text-red-500 transition-colors">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <p v-if="!filteredTransactions.length" class="text-slate-400 text-sm py-8 text-center">
          Nenhuma transação para os filtros selecionados.
        </p>
      </section>

      <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm mx-4">
          <h3 class="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h3>
          <p class="text-sm text-slate-500 mb-6">Deseja realmente excluir esta transação?</p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteModal = false"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm transition-colors">Cancelar</button>
            <button @click="confirmDelete"
              class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm transition-colors">Excluir</button>
          </div>
        </div>
      </div>
    </main>

    <NewTransactionalModal v-if="showModal" :year="selectedYear" :month="selectedMonth" @close="showModal = false"
      @transaction-created="onCreated" />



    <EditTransactionModal v-if="showEdit && editing" :transaction="editing" @close="showEdit = false"
      @transaction-updated="onUpdated" />
  </div>
</template>

<script setup>
import { PencilIcon, TrashIcon } from '@heroicons/vue/solid';
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import Navbar from "../components/navbar.vue";
import NewTransactionalModal from "../components/NewTransactionalModal.vue";
import EditTransactionModal from "../components/EditTransactionModal.vue";
import { getTransactions, deleteTransaction } from "../services/api";

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const typeFilter = ref("all");
const categoryFilter = ref("all");
const transactions = ref([]);
const showModal = ref(false);
const showEdit = ref(false);
const editing = ref(null);
const showDeleteModal = ref(false);
const selectedTransactionId = ref(null);

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const yearOptions = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

const filteredTransactions = computed(() => {
  return transactions.value.filter((t) => {
    const passType = typeFilter.value === "all" || t.type === typeFilter.value;
    const passCategory = categoryFilter.value === "all" || (t.category || "outros") === categoryFilter.value;
    return passType && passCategory;
  });
});

function openDeleteModal(id) {
  selectedTransactionId.value = id;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  try {
    await deleteTransaction(selectedTransactionId.value);
    showDeleteModal.value = false;
    loadTransactions();
  } catch {
    console.error("Erro ao deletar transação");
  }
}

async function loadTransactions() {
  const data = await getTransactions(selectedYear.value, selectedMonth.value);
  transactions.value = Array.isArray(data) ? data : [];
}

function amountColor(type) {
  if (type === "income") return "text-emerald-600";
  return "text-red-500";
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("pt-BR");
}

function formatType(type) {
  const map = {
    income: "Receita",
    debit: "Débito",
    credit: "Crédito",
    savings: "Guardado",
  };
  return map[type] || type;
}

function formatCategory(category) {
  if (!category) return "Sem categoria";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function startEdit(transaction) {
  editing.value = transaction;
  showEdit.value = true;
}

function onCreated() {
  showModal.value = false;
  loadTransactions();
}

function onUpdated() {
  showEdit.value = false;
  loadTransactions();
}

onMounted(loadTransactions);
watch(() => [selectedYear.value, selectedMonth.value], loadTransactions);
</script>
