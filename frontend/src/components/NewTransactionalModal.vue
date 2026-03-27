<template>
    <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-xl">
            <div class="flex items-center justify-between mb-5">
                <h2 class="text-xl font-semibold text-slate-900">Nova transação</h2>
                <button type="button"
                    class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    @click="closeModal">
                    ×
                </button>
            </div>

            <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveTransaction">
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                    <select
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                        v-model="type">
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito</option>
                        <option value="income">Adicionar saldo</option>
                        <option value="savings">Guardar valor</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-1">Data</label>
                    <input v-model="date" type="date" required
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300">
                </div>

                <div v-if="requiresCategory" class="md:col-span-1">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                    <select v-model="category"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300">
                        <option value="">Selecione uma categoria</option>
                        <option v-for="cat in categories" :key="cat._id" :value="cat.name">
                            {{ cat.name }}
                        </option>
                    </select>
                </div>

                <div v-if="type === 'credit'" class="md:col-span-1">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Parcelas</label>
                    <input type="number" min="1" max="12" v-model="installments"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300">
                </div>

                <div class="md:col-span-1">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                    <input v-model="value" type="number" step="0.01" min="0"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300">
                </div>

                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                    <textarea v-model="description" rows="2"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                        placeholder="Ex: Mercado da semana"></textarea>
                </div>

                <p v-if="errorMessage" class="md:col-span-2 text-sm text-red-600">{{ errorMessage }}</p>

                <div class="flex justify-end gap-3 md:col-span-2 mt-1">
                    <button type="button"
                        class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        @click="closeModal">
                        Cancelar
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors">
                        Salvar
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { useTransactions } from "../services/useTransactions";
import { useCategories } from "../services/useCategories";
import { useTransactionForm } from "../services/useTransactionForm";

const props = defineProps({
    year: Number,
    month: Number,
});

const emit = defineEmits(["close", "transaction-created"]);

// Usar composables
const { createNew } = useTransactions();
const { categories } = useCategories();
const {
    type, value, date, category, description, installments, errorMessage,
    requiresCategory, validate, getFormData, reset
} = useTransactionForm(categories);

const pad = (num) => String(num).padStart(2, "0");

const defaultDate = computed(() => {
    if (!props.year || !props.month) return new Date().toISOString().slice(0, 10);
    return `${props.year}-${pad(props.month)}-01`;
});

watch(
    () => defaultDate.value,
    (nextDate) => {
        if (!date.value) {
            date.value = nextDate;
        }
    },
    { immediate: true }
);

async function saveTransaction() {
    if (!validate()) return;

    try {
        const response = await createNew(getFormData());
        if (response?.message && !response?._id) {
            errorMessage.value = response.message;
            return;
        }
        emit("transaction-created");
        reset();
        closeModal();
    } catch (error) {
        errorMessage.value = "Erro ao salvar transação.";
    }
}

function closeModal() {
    emit("close");
}
</script>