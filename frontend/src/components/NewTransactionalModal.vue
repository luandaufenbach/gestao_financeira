<template>
    <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-xl">
            <div class="flex items-center justify-between mb-5">
                <h2 class="text-xl font-semibold text-slate-900">Nova transação</h2>
                <button
                    type="button"
                    class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    @click="closeModal"
                >
                    ×
                </button>
            </div>

            <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveTransaction">
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                    <select class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300" v-model="type">
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito</option>
                        <option value="income">Adicionar saldo</option>
                        <option value="savings">Guardar valor</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-1">Data</label>
                    <input
                        v-model="date"
                        type="date"
                        required
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                    >
                </div>

                <div v-if="requiresCategory" class="md:col-span-1">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                    <select v-model="category" class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300">
                        <option value="">Selecione uma categoria</option>
                        <option value="mercado">Mercado</option>
                        <option value="combustivel">Combustível</option>
                        <option value="lazer">Lazer</option>
                        <option value="saude">Saúde</option>
                        <option value="outros">Outros</option>
                    </select>
                </div>

                <div v-if="type === 'credit'" class="md:col-span-1">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Parcelas</label>
                    <input
                        type="number"
                        min="1"
                        max="12"
                        v-model="installments"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                    >
                </div>

                <div class="md:col-span-1">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                    <input
                        v-model="value"
                        type="number"
                        step="0.01"
                        min="0"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                    >
                </div>

                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                    <textarea
                        v-model="description"
                        rows="2"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
                        placeholder="Ex: Mercado da semana"
                    ></textarea>
                </div>

                <p v-if="errorMessage" class="md:col-span-2 text-sm text-red-600">{{ errorMessage }}</p>

                <div class="flex justify-end gap-3 md:col-span-2 mt-1">
                    <button type="button" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors" @click="closeModal">
                        Cancelar
                    </button>
                    <button type="submit" class="px-4 py-2 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors">
                        Salvar
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { createTransaction } from "../services/api";

const props = defineProps({
        year: Number,
        month: Number,
});

const emit = defineEmits(["close", "transaction-created"]);

const type = ref("debit");
const installments = ref(1);

const value = ref("");
const date = ref("");
const category = ref("");
const description = ref("");
const errorMessage = ref("");

const requiresCategory = computed(() => ["debit", "credit"].includes(type.value));

const pad = (num) => String(num).padStart(2, "0");

const defaultDate = computed(() => {
        if (!props.year || !props.month) return new Date().toISOString().slice(0, 10);
        return `${props.year}-${pad(props.month)}-01`;
});

watch(
        () => type.value,
        (nextType) => {
                if (!["debit", "credit"].includes(nextType)) {
                        category.value = "";
                        installments.value = 1;
                }
        }
);

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
        errorMessage.value = "";

        if (!description.value.trim()) {
                errorMessage.value = "Descrição é obrigatória.";
                return;
        }

        if (!value.value || Number(value.value) < 0) {
                errorMessage.value = "Informe um valor válido.";
                return;
        }

        if (!date.value) {
                errorMessage.value = "Informe a data da transação.";
                return;
        }

        if (requiresCategory.value && !category.value) {
                errorMessage.value = "Selecione uma categoria para débito/crédito.";
                return;
        }

    const newTransaction = {
        type: type.value,
                description: description.value.trim(),
        value: parseFloat(value.value),
        date: date.value,
                category: requiresCategory.value ? category.value : undefined,
        installment: {
            total: parseInt(installments.value),
            current: 1
        }
    };

    try {
                const response = await createTransaction(newTransaction);
                if (response?.message && !response?._id) {
                        errorMessage.value = response.message;
                        return;
                }
                emit("transaction-created");
        closeModal();
    } catch (error) {
                errorMessage.value = "Erro ao salvar transação.";
    }

}

function closeModal() {
    emit("close");
}
</script>