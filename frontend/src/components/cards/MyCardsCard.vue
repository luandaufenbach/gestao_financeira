<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 h-full">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Meus cartões</span>
      <span class="text-xl">🏦</span>
    </div>

    <!-- Card list -->
    <div class="flex flex-col gap-3 flex-1 min-h-0 overflow-auto pr-1">
      <div
        v-for="card in cards"
        :key="card._id"
        class="relative rounded-xl p-4 text-white overflow-hidden"
        :style="{ backgroundColor: card.color || '#1e293b' }"
      >
        <div class="flex justify-between items-start mb-4">
          <span class="text-xs font-semibold opacity-80 uppercase tracking-wide">
            {{ card.bank || card.name }}
          </span>
          <span class="text-xs font-medium opacity-70 capitalize">{{ card.type === 'credit' ? 'Crédito' : 'Débito' }}</span>
        </div>
        <p class="font-mono text-sm tracking-widest opacity-90">•••• •••• •••• {{ card.lastFourDigits }}</p>
        <div class="flex justify-between items-end mt-3">
          <span class="text-xs opacity-70 font-medium">{{ card.name }}</span>
          <button
            @click="removeCard(card._id)"
            class="text-white/50 hover:text-white/90 text-xs transition-colors"
            title="Remover cartão"
          >✕</button>
        </div>
      </div>

      <p v-if="!cards.length" class="text-sm text-slate-400 text-center py-4">
        Nenhum cartão adicionado
      </p>
    </div>

    <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>

    <!-- Add card button -->
    <button
      @click="showForm = !showForm"
      class="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 text-slate-400 hover:border-green-400 hover:text-green-600 rounded-xl py-2.5 text-sm font-medium transition-colors"
    >
      <span>+</span> Adicionar cartão
    </button>

    <!-- Inline form -->
    <div v-if="showForm" class="border border-slate-200 rounded-xl p-4 space-y-3">
      <h3 class="text-sm font-semibold text-slate-700">Novo cartão</h3>

      <input
        v-model="form.name"
        type="text"
        placeholder="Nome (ex: Nubank Black)"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <input
        v-model="form.bank"
        type="text"
        placeholder="Banco (ex: Nubank)"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <input
        v-model="form.lastFourDigits"
        type="text"
        maxlength="4"
        placeholder="Últimos 4 dígitos"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />

      <select
        v-model="form.type"
        class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      >
        <option value="credit">Crédito</option>
        <option value="debit">Débito</option>
      </select>

      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500">Cor:</label>
        <input v-model="form.color" type="color" class="h-8 w-12 rounded cursor-pointer border-0" />
      </div>

      <div class="flex gap-2">
        <button
          @click="showForm = false"
          class="flex-1 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >Cancelar</button>
        <button
          @click="saveCard"
          class="flex-1 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
        >Salvar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getBankCards, createBankCard, deleteBankCard } from "@/services/api";

const cards = ref([]);
const showForm = ref(false);
const errorMessage = ref("");

const form = ref({
  name: "",
  bank: "",
  lastFourDigits: "",
  type: "credit",
  color: "#1e293b",
});

async function fetchCards() {
  const data = await getBankCards();
  cards.value = Array.isArray(data) ? data : [];
}

async function saveCard() {
  errorMessage.value = "";
  const { name, lastFourDigits, type, color, bank } = form.value;
  const digitsOnly = String(lastFourDigits || "").replace(/\D/g, "");

  if (!name.trim()) {
    errorMessage.value = "Informe o nome do cartão.";
    return;
  }

  if (digitsOnly.length !== 4) {
    errorMessage.value = "Informe exatamente os 4 últimos dígitos.";
    return;
  }

  await createBankCard({
    name: name.trim(),
    bank: bank.trim(),
    lastFourDigits: digitsOnly,
    type,
    color,
  });

  form.value = { name: "", bank: "", lastFourDigits: "", type: "credit", color: "#1e293b" };
  showForm.value = false;
  fetchCards();
}

async function removeCard(id) {
  await deleteBankCard(id);
  fetchCards();
}

onMounted(fetchCards);
</script>
