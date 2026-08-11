<template>
  <div
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-transaction-title"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-xl">
      <div class="flex items-center justify-between mb-5">
        <h2 id="edit-transaction-title" class="text-xl font-semibold text-slate-900">
          Editar transação
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

      <p
        v-if="isInstallment"
        class="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800"
      >
        Esta é a parcela {{ transaction.installment.current }} de
        {{ transaction.installment.total }}. Alterações são aplicadas a
        <strong>todas as parcelas</strong> da compra, e o valor total é redistribuído entre elas.
      </p>

      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveTransaction">
        <TransactionFormFields :form="form" :categories="categories" :lock-installments="true" />

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
            {{ saving ? "Atualizando..." : "Atualizar" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTransactions } from "../services/useTransactions";
import { useCategories } from "../stores/categories";
import { useTransactionForm } from "../services/useTransactionForm";
import TransactionFormFields from "./TransactionFormFields.vue";

const props = defineProps({
  transaction: { type: Object, required: true },
});

const emit = defineEmits(["close", "transaction-updated"]);

const { update } = useTransactions();
const { categories, load: loadCategories } = useCategories();

// O formulário reconstrói o VALOR TOTAL a partir da parcela (ver bug C1).
const form = useTransactionForm(props.transaction);
const saving = ref(false);

const isInstallment = computed(() => (props.transaction.installment?.total ?? 1) > 1);

onMounted(loadCategories);

async function saveTransaction() {
  if (!form.validate()) return;

  saving.value = true;

  try {
    await update(props.transaction._id, form.getUpdatePayload());
    emit("transaction-updated");
    closeModal();
  } catch (error) {
    form.errorMessage.value = error.displayMessage ?? "Erro ao atualizar transação.";
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  emit("close");
}
</script>
