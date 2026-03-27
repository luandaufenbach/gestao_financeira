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
          class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          Transações
        </RouterLink>
        <RouterLink to="/goals" class="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-slate-900 shadow-sm">
          Metas
        </RouterLink>
      </nav>

      <div class="flex items-center justify-between">
        <h2 class="text-slate-500 text-xl font-bold tracking-wide">METAS ({{ goals.length }})</h2>
        <button @click="openCreate"
          class="group inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200">
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none">+</span>
          Nova Meta
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article v-for="goal in goals" :key="goal._id"
          class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-2xl font-bold text-slate-800 uppercase">{{ goal.name }}</p>
              <p class="text-slate-400 text-lg">Prazo: {{ formatDate(goal.deadline) }}</p>
            </div>
            <div class="flex items-center gap-2 text-slate-400">
              <button @click="startEdit(goal)" class="hover:text-slate-600 transition-colors" title="Editar">✎</button>
              <button @click="deleteConfirmation.open(goal._id)" class="hover:text-red-600 transition-colors"
                title="Excluir">🗑</button>
            </div>
          </div>

          <div class="flex items-end justify-between mt-3 mb-2">
            <p class="text-4xl font-extrabold text-emerald-500">{{ formatCurrency(goal.currentAmount) }}</p>
            <p class="text-slate-400 text-3xl">de {{ formatCurrency(goal.targetAmount) }}</p>
          </div>

          <div class="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full rounded-full"
              :style="{ width: calculateProgress(goal.currentAmount, goal.targetAmount) + '%', backgroundColor: '#22c55e' }">
            </div>
          </div>
          <p class="text-slate-400 text-lg mt-1">{{ calculateProgress(goal.currentAmount, goal.targetAmount) }}%
            concluído</p>
        </article>
      </div>

      <p v-if="!goals.length" class="text-slate-400 text-sm text-center py-8">Nenhuma meta cadastrada.</p>

      <div v-if="deleteConfirmation.showModal.value"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm mx-4">
          <h3 class="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h3>
          <p class="text-sm text-slate-500 mb-6">Deseja realmente excluir esta meta?</p>
          <div class="flex justify-end gap-3">
            <button @click="deleteConfirmation.close()"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm transition-colors">Cancelar</button>
            <button @click="deleteConfirmation.confirm()"
              class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm transition-colors">Excluir</button>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showModal" class="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div class="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-100 shadow-xl">
        <h3 class="text-xl font-semibold text-slate-900 mb-4">{{ editingId ? 'Editar meta' : 'Nova meta' }}</h3>

        <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveGoal">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-600 mb-1">Nome</label>
            <input v-model="form.name" class="w-full rounded-xl border border-slate-200 px-3 py-2.5" required>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Valor alvo</label>
            <input v-model.number="form.targetAmount" type="number" min="0" step="0.01"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5" required>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Valor atual</label>
            <input v-model.number="form.currentAmount" type="number" min="0" step="0.01"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5">
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-600 mb-1">Prazo para concluir</label>
            <input v-model="form.deadline" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2.5">
          </div>

          <div class="md:col-span-2 flex justify-end gap-3">
            <button type="button" @click="closeModal"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">Cancelar</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import Navbar from "../components/navbar.vue";
import { useGoals } from "../services/useGoals";
import { useFormatters } from "../services/useFormatters";
import { useDeleteConfirmation } from "../services/useDeleteConfirmation";

// Usar composables
const { goals, loadGoals, createNew, update, remove } = useGoals();
const { formatCurrency, formatDate, calculateProgress } = useFormatters();
const deleteConfirmation = useDeleteConfirmation(remove);

const showModal = ref(false);
const editingId = ref("");

const form = ref({
  name: "",
  targetAmount: 0,
  currentAmount: 0,
  deadline: "",
});

function resetForm() {
  form.value = {
    name: "",
    targetAmount: 0,
    currentAmount: 0,
    deadline: "",
  };
  editingId.value = "";
}

function openCreate() {
  resetForm();
  showModal.value = true;
}

function startEdit(goal) {
  editingId.value = goal._id;
  form.value = {
    name: goal.name || "",
    targetAmount: goal.targetAmount || 0,
    currentAmount: goal.currentAmount || 0,
    deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : "",
  };
  showModal.value = true;
}

async function saveGoal() {
  const payload = {
    name: form.value.name,
    targetAmount: Number(form.value.targetAmount),
    currentAmount: Number(form.value.currentAmount),
    deadline: form.value.deadline || undefined,
  };

  try {
    if (editingId.value) {
      await update(editingId.value, payload);
    } else {
      await createNew(payload);
    }
    closeModal();
  } catch (error) {
    console.error("Erro ao salvar meta:", error);
  }
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

onMounted(loadGoals);
</script>
