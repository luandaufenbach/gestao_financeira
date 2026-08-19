<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
    <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Meus cartões</span>

    <div class="flex flex-col gap-3">
      <div
        v-for="card in bankCards"
        :key="card._id"
        class="relative rounded-xl p-4 text-white overflow-hidden"
        :style="{ backgroundColor: card.color || '#1e293b' }"
      >
        <div class="flex justify-between items-start mb-4">
          <span class="text-xs font-semibold opacity-80 uppercase tracking-wide">
            {{ card.bank || card.name }}
          </span>
          <span class="text-xs font-medium opacity-70">
            {{ card.type === "credit" ? "Crédito" : "Débito" }}
          </span>
        </div>
        <p class="font-mono text-sm tracking-widest opacity-90">
          •••• •••• •••• {{ card.lastFourDigits }}
        </p>
        <div class="flex justify-between items-end mt-3">
          <span class="text-xs opacity-70 font-medium">{{ card.name }}</span>
          <button
            type="button"
            class="text-white/50 hover:text-white/90 text-xs transition-colors cursor-pointer"
            title="Remover cartão"
            aria-label="Remover cartão"
            @click="deleteConfirmation.open(card._id)"
          >
            ✕
          </button>
        </div>
      </div>

      <p v-if="!loading && !bankCards.length" class="text-sm text-slate-400 text-center py-4">
        Nenhum cartão adicionado
      </p>
    </div>

    <p v-if="errorMessage || error" class="text-xs text-red-600">{{ errorMessage || error }}</p>

    <button
      type="button"
      class="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 text-slate-400 hover:border-green-400 hover:text-green-600 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer"
      @click="toggleForm"
    >
      <span>+</span> Adicionar cartão
    </button>

    <form
      v-if="showForm"
      class="border border-slate-200 rounded-xl p-4 space-y-3"
      @submit.prevent="saveCard"
    >
      <h3 class="text-sm font-semibold text-slate-700">Novo cartão</h3>

      <input
        v-model="form.name"
        type="text"
        placeholder="Nome (ex: Nubank Black)"
        maxlength="60"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <input
        v-model="form.bank"
        type="text"
        placeholder="Banco (ex: Nubank)"
        maxlength="60"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <input
        v-model="form.lastFourDigits"
        type="text"
        maxlength="4"
        inputmode="numeric"
        placeholder="Últimos 4 dígitos"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />

      <select
        v-model="form.type"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
      >
        <option value="credit">Crédito</option>
        <option value="debit">Débito</option>
      </select>

      <!--
        Só cartão de crédito tem fatura. Sem estes dois dias, as compras não
        podem ser agrupadas por ciclo e o card de Faturas fica sem o que mostrar.
      -->
      <div v-if="form.type === 'credit'" class="grid grid-cols-2 gap-2">
        <div>
          <label for="card-closing" class="block text-xs text-slate-500 mb-1">Fecha dia</label>
          <input
            id="card-closing"
            v-model.number="form.closingDay"
            type="number"
            min="1"
            max="31"
            placeholder="01"
            class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label for="card-due" class="block text-xs text-slate-500 mb-1">Vence dia</label>
          <input
            id="card-due"
            v-model.number="form.dueDay"
            type="number"
            min="1"
            max="31"
            placeholder="05"
            class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <label for="card-color" class="text-xs text-slate-500">Cor:</label>
        <input
          id="card-color"
          v-model="form.color"
          type="color"
          class="h-8 w-12 rounded cursor-pointer border-0"
        />
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          @click="showForm = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="flex-1 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-60 cursor-pointer"
        >
          {{ saving ? "Salvando..." : "Salvar" }}
        </button>
      </div>
    </form>

    <ConfirmDialog
      :open="deleteConfirmation.isOpen.value"
      :busy="deleteConfirmation.busy.value"
      title="Remover cartão"
      message="As transações vinculadas serão mantidas, apenas desvinculadas deste cartão."
      confirm-label="Remover"
      @confirm="deleteConfirmation.confirm()"
      @cancel="deleteConfirmation.close()"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useBankCards } from "@/services/useBankCards";
import { useDeleteConfirmation } from "@/services/useDeleteConfirmation";
import ConfirmDialog from "../ConfirmDialog.vue";

/**
 * Este componente falava direto com api.js, duplicando a lógica que já existia
 * em useBankCards (que, por sua vez, não era usado em lugar nenhum). Agora usa
 * o composable, e a exclusão passa por confirmação — antes um clique no "✕"
 * apagava o cartão na hora, sem chance de desfazer.
 */
const { bankCards, loading, error, loadBankCards, createNew, remove } = useBankCards();
const deleteConfirmation = useDeleteConfirmation(remove);

const showForm = ref(false);
const saving = ref(false);
const errorMessage = ref("");

const form = reactive({
  name: "",
  bank: "",
  lastFourDigits: "",
  type: "credit",
  color: "#1e293b",
});

function resetForm() {
  Object.assign(form, {
    name: "",
    bank: "",
    lastFourDigits: "",
    type: "credit",
    color: "#1e293b",
    closingDay: null,
    dueDay: null,
  });
}

function toggleForm() {
  showForm.value = !showForm.value;
  errorMessage.value = "";
}

async function saveCard() {
  errorMessage.value = "";

  const digitsOnly = String(form.lastFourDigits || "").replace(/\D/g, "");

  if (!form.name.trim()) {
    errorMessage.value = "Informe o nome do cartão.";
    return;
  }
  if (digitsOnly.length !== 4) {
    errorMessage.value = "Informe exatamente os 4 últimos dígitos.";
    return;
  }

  const isCredit = form.type === "credit";
  const hasClosing = isCredit && Boolean(form.closingDay);
  const hasDue = isCredit && Boolean(form.dueDay);

  // O backend recusa um dia sem o outro; avisamos antes de tentar.
  if (hasClosing !== hasDue) {
    errorMessage.value = "Informe o dia de fechamento e o de vencimento juntos.";
    return;
  }

  saving.value = true;

  try {
    await createNew({
      name: form.name.trim(),
      bank: form.bank.trim(),
      lastFourDigits: digitsOnly,
      type: form.type,
      color: form.color,
      // Cartão de débito não tem fatura: os dias vão nulos.
      closingDay: hasClosing ? form.closingDay : null,
      dueDay: hasDue ? form.dueDay : null,
    });

    resetForm();
    showForm.value = false;
  } catch (err) {
    // Antes, um erro aqui era completamente silencioso: saveCard não tinha
    // try/catch e a promise rejeitada morria no console.
    errorMessage.value = err.displayMessage ?? "Erro ao salvar cartão.";
  } finally {
    saving.value = false;
  }
}

onMounted(loadBankCards);
</script>
