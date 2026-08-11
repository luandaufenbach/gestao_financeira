<template>
  <div
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="new-transaction-title"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-xl">
      <div class="flex items-center justify-between mb-5">
        <h2 id="new-transaction-title" class="text-xl font-semibold text-slate-900">
          Nova transação
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveTransaction">
        <TransactionFormFields :form="form" :categories="categories" />

        <p v-if="form.errorMessage.value" class="md:col-span-2 text-sm text-red-600">
          {{ form.errorMessage.value }}
        </p>

        <div class="flex justify-end gap-3 md:col-span-2 mt-1">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            @click="closeModal"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {{ saving ? "Salvando..." : "Salvar" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useTransactions } from "../services/useTransactions";
import { useCategories } from "../stores/categories";
import { useTransactionForm } from "../services/useTransactionForm";
import TransactionFormFields from "./TransactionFormFields.vue";

const props = defineProps({
  year: Number,
  month: Number,
});

const emit = defineEmits(["close", "transaction-created"]);

const { createNew } = useTransactions();
// Store singleton: a lista é a mesma que a tela por trás do modal enxerga,
// então criar uma categoria lá reflete aqui na hora (bug A6).
const { categories, load: loadCategories } = useCategories();

const form = useTransactionForm();
const saving = ref(false);

const pad = (num) => String(num).padStart(2, "0");

onMounted(() => {
  loadCategories();

  /**
   * Sugere o dia 1º do mês que está sendo visualizado.
   *
   * A versão anterior fazia isso com um watch + computed que rodava a cada
   * mudança de props, apenas para preencher um valor inicial. Como o modal é
   * criado e destruído a cada abertura (v-if), definir no onMounted basta.
   */
  form.date.value =
    props.year && props.month
      ? `${props.year}-${pad(props.month)}-01`
      : new Date().toISOString().slice(0, 10);
});

async function saveTransaction() {
  if (!form.validate()) return;

  saving.value = true;

  try {
    await createNew(form.getCreatePayload());

    /**
     * Antes era necessário inspecionar a resposta em busca de um campo
     * `message` para descobrir se tinha dado erro, porque api.js não checava
     * o status HTTP (bug A1). Agora uma falha simplesmente lança.
     */
    emit("transaction-created");
    form.reset();
    closeModal();
  } catch (error) {
    form.errorMessage.value = error.displayMessage ?? "Erro ao salvar transação.";
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  emit("close");
}
</script>
