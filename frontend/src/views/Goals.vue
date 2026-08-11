<template>
  <div class="min-h-screen bg-slate-50">
    <Navbar />

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <AppTabs />

      <div class="flex items-center justify-between">
        <h2 class="text-slate-500 text-xl font-bold tracking-wide">METAS ({{ goals.length }})</h2>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200 cursor-pointer"
          @click="openCreate"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none"
            >+</span
          >
          Nova meta
        </button>
      </div>

      <p v-if="loading" class="text-slate-400 text-sm text-center py-8">Carregando...</p>

      <p v-else-if="error" class="text-red-600 text-sm text-center py-8">{{ error }}</p>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article
          v-for="goal in goals"
          :key="goal._id"
          class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="min-w-0">
              <p class="text-2xl font-bold text-slate-800 uppercase truncate">{{ goal.name }}</p>
              <p class="text-slate-400 text-lg">
                Prazo: {{ goal.deadline ? formatDate(goal.deadline) : "sem prazo" }}
              </p>
            </div>
            <div class="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                title="Editar"
                aria-label="Editar meta"
                class="hover:text-slate-600 transition-colors cursor-pointer"
                @click="startEdit(goal)"
              >
                ✎
              </button>
              <button
                type="button"
                title="Excluir"
                aria-label="Excluir meta"
                class="hover:text-red-600 transition-colors cursor-pointer"
                @click="deleteConfirmation.open(goal._id)"
              >
                🗑
              </button>
            </div>
          </div>

          <div class="flex items-end justify-between mt-3 mb-2">
            <p class="text-4xl font-extrabold text-emerald-500">
              {{ formatCurrency(goal.currentAmountInCents) }}
            </p>
            <p class="text-slate-400 text-3xl">de {{ formatCurrency(goal.targetAmountInCents) }}</p>
          </div>

          <div class="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: progress(goal) + '%',
                backgroundColor: goal.color || '#22c55e',
              }"
            ></div>
          </div>
          <p class="text-slate-400 text-lg mt-1">{{ progress(goal) }}% concluído</p>
        </article>
      </div>

      <p v-if="!loading && !error && !goals.length" class="text-slate-400 text-sm text-center py-8">
        Nenhuma meta cadastrada.
      </p>
    </main>

    <ConfirmDialog
      :open="deleteConfirmation.isOpen.value"
      :busy="deleteConfirmation.busy.value"
      title="Excluir meta"
      message="Deseja realmente excluir esta meta?"
      @confirm="deleteConfirmation.confirm()"
      @cancel="deleteConfirmation.close()"
    />

    <div
      v-if="showModal"
      class="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      @click.self="closeModal"
    >
      <div class="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-100 shadow-xl">
        <h3 id="goal-modal-title" class="text-xl font-semibold text-slate-900 mb-4">
          {{ editingId ? "Editar meta" : "Nova meta" }}
        </h3>

        <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveGoal">
          <div class="md:col-span-2">
            <label for="goal-name" class="block text-sm font-medium text-slate-600 mb-1"
              >Nome</label
            >
            <input
              id="goal-name"
              v-model="form.name"
              maxlength="120"
              required
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>

          <div>
            <label for="goal-target" class="block text-sm font-medium text-slate-600 mb-1"
              >Valor alvo</label
            >
            <input
              id="goal-target"
              v-model="form.targetAmount"
              type="number"
              min="0"
              step="0.01"
              required
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>

          <div>
            <label for="goal-current" class="block text-sm font-medium text-slate-600 mb-1"
              >Valor atual</label
            >
            <input
              id="goal-current"
              v-model="form.currentAmount"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>

          <div>
            <label for="goal-deadline" class="block text-sm font-medium text-slate-600 mb-1">
              Prazo para concluir
            </label>
            <input
              id="goal-deadline"
              v-model="form.deadline"
              type="date"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>

          <div>
            <label for="goal-color" class="block text-sm font-medium text-slate-600 mb-1"
              >Cor</label
            >
            <input
              id="goal-color"
              v-model="form.color"
              type="color"
              class="w-full h-11 rounded-xl border border-slate-200 cursor-pointer"
            />
          </div>

          <p v-if="formError" class="md:col-span-2 text-sm text-red-600">{{ formError }}</p>

          <div class="md:col-span-2 flex justify-end gap-3">
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
              class="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {{ saving ? "Salvando..." : "Salvar" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import Navbar from "../components/navbar.vue";
import AppTabs from "../components/AppTabs.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useGoals } from "../services/useGoals";
import { useFormatters } from "../services/useFormatters";
import { useDeleteConfirmation } from "../services/useDeleteConfirmation";

const { goals, loading, error, loadGoals, createNew, update, remove } = useGoals();
const {
  formatCurrency,
  formatDate,
  formatDateForInput,
  calculateProgress,
  parseCurrencyToCents,
  centsToInputValue,
} = useFormatters();

const deleteConfirmation = useDeleteConfirmation(remove);

const showModal = ref(false);
const editingId = ref("");
const saving = ref(false);
const formError = ref("");

// Os campos de valor ficam em reais (como o usuário digita) e só viram
// centavos no envio — ver useFormatters.parseCurrencyToCents (C7).
const form = reactive({
  name: "",
  targetAmount: "0.00",
  currentAmount: "0.00",
  deadline: "",
  color: "#22c55e",
});

const progress = (goal) => calculateProgress(goal.currentAmountInCents, goal.targetAmountInCents);

function resetForm() {
  Object.assign(form, {
    name: "",
    targetAmount: "0.00",
    currentAmount: "0.00",
    deadline: "",
    color: "#22c55e",
  });
  editingId.value = "";
  formError.value = "";
}

function openCreate() {
  resetForm();
  showModal.value = true;
}

function startEdit(goal) {
  editingId.value = goal._id;
  Object.assign(form, {
    name: goal.name ?? "",
    targetAmount: centsToInputValue(goal.targetAmountInCents),
    currentAmount: centsToInputValue(goal.currentAmountInCents),
    // formatDateForInput lê a data em UTC, evitando o off-by-one-day que o
    // toISOString() sobre uma data local produzia (C2).
    deadline: formatDateForInput(goal.deadline),
    color: goal.color ?? "#22c55e",
  });
  formError.value = "";
  showModal.value = true;
}

async function saveGoal() {
  formError.value = "";

  const targetInCents = parseCurrencyToCents(form.targetAmount);
  const currentInCents = parseCurrencyToCents(form.currentAmount);

  if (targetInCents === null || currentInCents === null) {
    formError.value = "Informe valores numéricos válidos.";
    return;
  }
  if (targetInCents < 0 || currentInCents < 0) {
    formError.value = "Os valores não podem ser negativos.";
    return;
  }

  const payload = {
    name: form.name.trim(),
    targetAmountInCents: targetInCents,
    currentAmountInCents: currentInCents,
    color: form.color,
    deadline: form.deadline || null,
  };

  saving.value = true;

  try {
    if (editingId.value) {
      await update(editingId.value, payload);
    } else {
      await createNew(payload);
    }
    closeModal();
  } catch (err) {
    // Antes o erro só ia para o console.error e o modal fechava como se
    // tivesse dado certo.
    formError.value = err.displayMessage ?? "Erro ao salvar meta.";
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

onMounted(loadGoals);
</script>
