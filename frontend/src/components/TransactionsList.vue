<template>
  <section class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Últimas transações</span>
      <RouterLink v-if="showViewMore" :to="viewMoreTo"
        class="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
        Ver mais
        <span aria-hidden="true">→</span>
      </RouterLink>
      <span v-else class="text-xl">📋</span>
    </div>

    <p v-if="!loading && !error && transactions.length === 0" class="text-sm text-slate-400 text-center py-4">
      Nenhuma transação encontrada.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li v-for="t in transactions" :key="t._id"
        class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
            :class="typeStyle(t.type).bg">
            {{ typeStyle(t.type).icon }}
          </div>
          <div class="min-w-0">
            <p class="font-medium text-slate-800 text-sm truncate">{{ t.description }}</p>
            <p class="text-xs text-slate-400">{{ formatDate(t.date) }} · <span class="capitalize">{{ t.category || '—'
            }}</span>
              <span v-if="t.installment?.total > 1" class="ml-1 text-blue-600 font-semibold">
                {{ t.installment.current }}/{{ t.installment.total }}
              </span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-semibold text-sm" :class="t.type === 'income' ? 'text-green-600' : 'text-red-500'">
            {{ t.type === 'income' ? '+' : '-' }} {{ formatCurrency(t.value) }}
          </span>

          <button @click="editTransaction(t)" class="text-slate-400 hover:text-slate-600 transition-colors">
            <PencilIcon class="w-4 h-4" />
          </button>
          <button @click="openDeleteModal(t._id)" class="text-slate-400 hover:text-red-500 transition-colors">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </li>
    </ul>

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

    <EditTransactionModal v-if="showEditModal && selectedTransaction" :transaction="selectedTransaction"
      @close="showEditModal = false" @transaction-updated="handleTransactionUpdated" />
  </section>
</template>

<script setup>
import { PencilIcon, TrashIcon } from '@heroicons/vue/solid';
import { RouterLink } from "vue-router";
import EditTransactionModal from './EditTransactionModal.vue';
import { ref, onMounted, watch, defineExpose, defineEmits } from "vue";
import { getTransactions, deleteTransaction } from "../services/api";

const emit = defineEmits(["transaction-deleted", "transaction-updated"]);
const props = defineProps({
  year: Number,
  month: Number,
  limit: {
    type: Number,
    default: 8,
  },
  showViewMore: {
    type: Boolean,
    default: false,
  },
  viewMoreTo: {
    type: String,
    default: "/transactions",
  },
});

const transactions = ref([]);
const loading = ref(false);
const error = ref("");

const showDeleteModal = ref(false);
const selectedTransactionId = ref(null);
const showEditModal = ref(false);
const selectedTransaction = ref(null);

const TYPE_STYLES = {
  income: { icon: "↑", bg: "bg-green-100 text-green-700" },
  debit: { icon: "↓", bg: "bg-red-100 text-red-600" },
  credit: { icon: "💳", bg: "bg-amber-100 text-amber-600" },
  savings: { icon: "🏦", bg: "bg-blue-100 text-blue-600" },
};

function typeStyle(type) {
  return TYPE_STYLES[type] ?? { icon: "·", bg: "bg-slate-100 text-slate-500" };
}

const loadTransactions = async () => {
  loading.value = true;
  error.value = "";
  try {
    const all = await getTransactions(props.year, props.month);
    transactions.value = Array.isArray(all) ? all.slice(0, props.limit) : [];
  } catch (e) {
    error.value = "Falha ao buscar transações.";
  } finally {
    loading.value = false;
  }
};

function openDeleteModal(id) {
  selectedTransactionId.value = id;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  try {
    await deleteTransaction(selectedTransactionId.value);
    showDeleteModal.value = false;
    loadTransactions();
    emit("transaction-deleted");
  } catch {
    error.value = "Erro ao deletar transação";
  }
}

async function handleTransactionUpdated() {
  showEditModal.value = false;
  loadTransactions();
  emit("transaction-updated");
}

function editTransaction(transaction) {
  selectedTransaction.value = transaction;
  showEditModal.value = true;
}

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("pt-BR");
};

onMounted(loadTransactions);
watch(() => [props.year, props.month], loadTransactions);

defineExpose({ loadTransactions });
</script>