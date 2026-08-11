<template>
  <section class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400"
        >Últimas transações</span
      >
      <RouterLink
        v-if="showViewMore"
        :to="viewMoreTo"
        class="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        Ver mais
        <span aria-hidden="true">→</span>
      </RouterLink>
      <span v-else class="text-xl" aria-hidden="true">📋</span>
    </div>

    <p v-if="loading" class="text-sm text-slate-400 text-center py-4">Carregando...</p>

    <p v-else-if="error" class="text-sm text-red-600 text-center py-4">{{ error }}</p>

    <p v-else-if="!transactions.length" class="text-sm text-slate-400 text-center py-4">
      Nenhuma transação encontrada.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="t in transactions"
        :key="t._id"
        class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
            :class="typeStyle(t.type).bg"
          >
            {{ typeStyle(t.type).icon }}
          </div>
          <div class="min-w-0">
            <p class="font-medium text-slate-800 text-sm truncate">{{ t.description }}</p>
            <p class="text-xs text-slate-400">
              {{ formatDate(t.date) }} · {{ formatCategory(t.category) }}
              <span v-if="t.installment?.total > 1" class="ml-1 text-blue-600 font-semibold">
                {{ t.installment.current }}/{{ t.installment.total }}
              </span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-semibold text-sm" :class="amountColor(t.type)">
            {{ amountSign(t.type) }} {{ formatCurrency(t.valueInCents) }}
          </span>

          <button
            type="button"
            aria-label="Editar transação"
            class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            @click="editTransaction(t)"
          >
            <PencilIcon class="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Excluir transação"
            class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            @click="askDelete(t)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </li>
    </ul>

    <DeleteTransactionDialog
      :transaction="pendingDelete"
      :busy="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />

    <EditTransactionModal
      v-if="editingTransaction"
      :transaction="editingTransaction"
      @close="editingTransaction = null"
      @transaction-updated="handleUpdated"
    />
  </section>
</template>

<script setup>
import { PencilIcon, TrashIcon } from "@heroicons/vue/24/solid";
import { RouterLink } from "vue-router";
import { ref, onMounted, watch } from "vue";
import EditTransactionModal from "./EditTransactionModal.vue";
import DeleteTransactionDialog from "./DeleteTransactionDialog.vue";
import { getTransactions, deleteTransaction } from "../services/api";
import { useFormatters } from "../services/useFormatters";

const emit = defineEmits(["transaction-deleted", "transaction-updated"]);

const props = defineProps({
  year: Number,
  month: Number,
  limit: { type: Number, default: 8 },
  showViewMore: { type: Boolean, default: false },
  viewMoreTo: { type: String, default: "/transactions" },
});

const { formatCurrency, formatDate, formatCategory, amountColor, amountSign } = useFormatters();

const transactions = ref([]);
const loading = ref(false);
const error = ref("");

const editingTransaction = ref(null);
const pendingDelete = ref(null);
const deleting = ref(false);
const deleteError = ref("");

const TYPE_STYLES = {
  income: { icon: "↑", bg: "bg-green-100 text-green-700" },
  debit: { icon: "↓", bg: "bg-red-100 text-red-600" },
  credit: { icon: "💳", bg: "bg-amber-100 text-amber-600" },
  savings: { icon: "🏦", bg: "bg-blue-100 text-blue-600" },
  // Mesma família visual do "guardado", com a seta invertida: é o caminho de
  // volta da reserva para a conta.
  withdrawal: { icon: "↩", bg: "bg-sky-100 text-sky-700" },
};

const typeStyle = (type) => TYPE_STYLES[type] ?? { icon: "·", bg: "bg-slate-100 text-slate-500" };

async function loadTransactions() {
  loading.value = true;
  error.value = "";

  try {
    // O limite agora é aplicado pelo backend, não com um .slice() depois de
    // baixar a coleção inteira.
    transactions.value = await getTransactions({
      year: props.year,
      month: props.month,
      limit: props.limit,
    });
  } catch (err) {
    error.value = err.displayMessage ?? "Falha ao buscar transações.";
    transactions.value = [];
  } finally {
    loading.value = false;
  }
}

function editTransaction(transaction) {
  editingTransaction.value = transaction;
}

function askDelete(transaction) {
  deleteError.value = "";
  pendingDelete.value = transaction;
}

/** @param {"single"|"group"} scope */
async function confirmDelete(scope) {
  deleting.value = true;
  deleteError.value = "";

  try {
    await deleteTransaction(pendingDelete.value._id, scope);
    pendingDelete.value = null;
    await loadTransactions();
    emit("transaction-deleted");
  } catch (err) {
    deleteError.value = err.displayMessage ?? "Erro ao excluir transação.";
  } finally {
    deleting.value = false;
  }
}

async function handleUpdated() {
  editingTransaction.value = null;
  await loadTransactions();
  emit("transaction-updated");
}

onMounted(loadTransactions);
watch(() => [props.year, props.month], loadTransactions);

defineExpose({ loadTransactions });
</script>
