<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-lg font-bold">Transações</h2>
    </div>

    <p v-if="!loading && !error && transactions.length === 0" class="mt-4 text-sm text-slate-500">
      Nenhuma transação encontrada.
    </p>

    <ul v-else class="mt-4 grid gap-3">
      <li v-for="t in transactions" :key="t._id" class="rounded-lg border border-slate-200 p-3">
        <div class="flex items-start justify-between gap-3">
          <p class="font-semibold text-slate-900">{{ t.description }}</p>

          <div class="flex items-center gap-2">
            <p class="whitespace-nowrap font-semibold"
              :class="t.type === 'credit' ? 'text-emerald-700' : 'text-red-700'">
              {{ t.type === 'credit' ? "+" : "-" }} {{ formatCurrency(t.value) }}
            </p>

            <button @click="editTransaction(t)" class="text-gray-600">
              <PencilIcon class="w-5 h-5" />
            </button>
            <button @click="deleteTransaction(t._id)" class="text-red-600">
              <TrashIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
        <p class="mt-1 text-xs text-slate-500">{{ formatDate(t.date) }}</p>
      </li>
    </ul>
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div class="bg-white p-6 rounded shadow-lg w-full max-w-sm">
        <h3 class="text-lg font-bold mb-4">Confirmação</h3>
        <p class="mb-4">Deseja realmente excluir esta transação?</p>

        <div class="flex justify-end gap-2">
          <button @click="showDeleteModal = false" class="px-3 py-1 rounded bg-gray-300">
            Cancelar
          </button>
          <button @click="confirmDelete" class="px-3 py-1 rounded bg-red-600 text-white">
            Excluir
          </button>
        </div>
      </div>
    </div>
    <EditTransactionModal v-if="showEditModal && selectedTransaction" :transaction="selectedTransaction"
      @close="showEditModal = false" @transaction-updated="handleTransactionUpdated" />
  </section>
</template>

<script setup>
import { PencilIcon, TrashIcon } from '@heroicons/vue/solid';
import EditTransactionModal from './EditTransactionModal.vue';
import { ref, onMounted, defineExpose, defineEmits } from "vue";
import axios from "axios";

const emit = defineEmits(["transaction-deleted", "transaction-updated"]);


const API_BASE_URL = "http://localhost:3000";

const transactions = ref([]);
const loading = ref(false);
const error = ref("");

const showDeleteModal = ref(false);
const selectedTransactionId = ref(null);

const showEditModal = ref(false) 
const selectedTransaction = ref(null);

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

function deleteTransaction(id) {
  selectedTransactionId.value = id; //guarada o id q vai deletar
  showDeleteModal.value = true; //abre a janela
}

async function confirmDelete() {
  try {
    await axios.delete(`${API_BASE_URL}/transactions/${selectedTransactionId.value}`);
    showDeleteModal.value = false; //fecha a janela
    loadTransactions(); //atualiza a lista sem o f5
    emit("transaction-deleted")
  } catch (error) {
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

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Number(value || 0));
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("pt-BR");
};

onMounted(() => {
  loadTransactions();
});

defineExpose({
  loadTransactions
});

</script>