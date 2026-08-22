<template>
  <div class="min-h-screen bg-slate-50">
    <Navbar />

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <AppTabs />

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model.number="selectedMonth"
          aria-label="Mês"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm cursor-pointer capitalize"
        >
          <option v-for="m in 12" :key="m" :value="m">{{ MONTH_NAMES[m - 1] }}</option>
        </select>

        <select
          v-model.number="selectedYear"
          aria-label="Ano"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm cursor-pointer"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>

        <select
          v-model="typeFilter"
          aria-label="Tipo"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm cursor-pointer"
        >
          <option value="all">Todos os tipos</option>
          <option value="income">Receita</option>
          <option value="debit">Débito</option>
          <option value="credit">Crédito</option>
          <option value="savings">Guardado</option>
          <option value="withdrawal">Resgate</option>
          <option value="invoice_payment">Fatura paga</option>
        </select>

        <select
          v-model="categoryFilter"
          aria-label="Categoria"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm cursor-pointer"
        >
          <option value="all">Todas as categorias</option>
          <!--
            BUG CORRIGIDO (M6): a opção "sem categoria" não existia. O filtro
            comparava (t.category || "outros") com o nome da categoria, mas
            "outros" nunca aparecia na lista de opções, então transações sem
            categoria eram impossíveis de filtrar.
          -->
          <option value="none">Sem categoria</option>
          <option v-for="cat in categories" :key="cat._id" :value="cat._id">
            {{ cat.name }}
          </option>
        </select>

        <button
          type="button"
          class="ml-auto inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200 cursor-pointer"
          @click="showCategoryModal = true"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none"
            >+</span
          >
          Criar categoria
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200 cursor-pointer"
          @click="showModal = true"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none"
            >+</span
          >
          Nova transação
        </button>
      </div>

      <!--
        A lista vive dentro de um card só, com as mesmas linhas do dashboard,
        em vez de um card por transação. Antes cada lançamento era um bloco
        branco de px-5 py-4 com texto text-xl e valor text-3xl: a mesma
        informação do dashboard ocupando o triplo da altura.
      -->
      <section
        class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Transações
          </span>
          <span class="text-xs font-semibold text-slate-400">
            {{ filteredTransactions.length }}
          </span>
        </div>

        <p v-if="loading" class="text-sm text-slate-400 text-center py-4">Carregando...</p>

        <p v-else-if="error" class="text-sm text-red-600 text-center py-4">{{ error }}</p>

        <p v-else-if="!filteredTransactions.length" class="text-sm text-slate-400 text-center py-4">
          Nenhuma transação para os filtros selecionados.
        </p>

        <ul v-else class="flex flex-col gap-2">
          <TransactionRow
            v-for="t in filteredTransactions"
            :key="t._id"
            :transaction="t"
            show-type
            @edit="startEdit"
            @delete="askDelete"
          />
        </ul>
      </section>
    </main>

    <DeleteTransactionDialog
      :transaction="pendingDelete"
      :busy="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />

    <NewTransactionalModal
      v-if="showModal"
      :year="selectedYear"
      :month="selectedMonth"
      @close="showModal = false"
      @transaction-created="reload"
    />

    <CategoriesModal v-if="showCategoryModal" @close="showCategoryModal = false" />

    <EditTransactionModal
      v-if="editing"
      :transaction="editing"
      @close="editing = null"
      @transaction-updated="reload"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import Navbar from "../components/navbar.vue";
import AppTabs from "../components/AppTabs.vue";
import TransactionRow from "../components/TransactionRow.vue";
import NewTransactionalModal from "../components/NewTransactionalModal.vue";
import EditTransactionModal from "../components/EditTransactionModal.vue";
import CategoriesModal from "../components/CategoriesModal.vue";
import DeleteTransactionDialog from "../components/DeleteTransactionDialog.vue";
import { useTransactions } from "../services/useTransactions";
import { useCategories } from "../stores/categories";
import { useMonthNavigation, MONTH_NAMES } from "../services/useMonthNavigation";

const { selectedYear, selectedMonth } = useMonthNavigation();
const { transactions, loading, error, loadTransactions, remove } = useTransactions();
const { categories, load: loadCategories } = useCategories();

const typeFilter = ref("all");
const categoryFilter = ref("all");
const showModal = ref(false);
const showCategoryModal = ref(false);
const editing = ref(null);

const pendingDelete = ref(null);
const deleting = ref(false);
const deleteError = ref("");

const currentYear = new Date().getUTCFullYear();
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const filteredTransactions = computed(() =>
  transactions.value.filter((t) => {
    const passType = typeFilter.value === "all" || t.type === typeFilter.value;

    // A categoria vem populada como objeto ({_id, name, color}) ou null (A7).
    const categoryId = t.category?._id ?? null;
    const passCategory =
      categoryFilter.value === "all" ||
      (categoryFilter.value === "none" ? categoryId === null : categoryId === categoryFilter.value);

    return passType && passCategory;
  })
);

function reload() {
  showModal.value = false;
  editing.value = null;
  loadTransactions({ year: selectedYear.value, month: selectedMonth.value });
}

function startEdit(transaction) {
  editing.value = transaction;
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
    await remove(pendingDelete.value._id, scope);
    pendingDelete.value = null;
    // Recarrega porque scope="group" remove várias de uma vez, e o composable
    // só consegue tirar da lista local a que foi pedida.
    loadTransactions({ year: selectedYear.value, month: selectedMonth.value });
  } catch (err) {
    deleteError.value = err.displayMessage ?? "Erro ao excluir transação.";
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  loadCategories();
  loadTransactions({ year: selectedYear.value, month: selectedMonth.value });
});

watch([selectedYear, selectedMonth], () => {
  loadTransactions({ year: selectedYear.value, month: selectedMonth.value });
});
</script>
