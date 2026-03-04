<template>
    <div class="fixed inset-0 bg-black/30 flex items-center justify-center">
        <div class="bg-white rounded shadow-lg p-6 w-full max-w-lg relative">
            <h2 class="text-xl font-semibold mb-4">Nova transação</h2>
            <form class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="mb-1">
                    <label class="block font-medium">
                        tipo:
                    </label>
                    <select class="border rounded px-2 py-1 w-full" v-model="type">
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito</option>
                        <option value="income">Adicionar saldo</option>
                        <option value="savings">Guardar valor</option>
                    </select>
                </div>
                <div>
                    <label class="block">Data:</label>
                    <input v-model="date" type="date" class="border rounded px-2 py-1 w-full" required>
                </div>
                <div class="md:col-span-1">
                    <label class="block font-medium">Categoria:</label>
                    <select v-model="category" class="border rounded px-2 py-1 w-full">
                        <option value="">Selecione uma categoria</option>
                        <option value="mercado">Mercado</option>
                        <option value="combustivel">Combustível</option>
                        <option value="lazer">Lazer</option>
                        <option value="saude">Saúde</option>
                    </select>
                </div>
                <div class="md:col-span-1" v-if="type === 'credit'">
                    <label class="block font-medium">Parcelas:</label>
                    <input type="number" min="1" max="12" v-model="installments" class="border rounded px-2 py-1 w-full">
                </div>
                <div class="md:col-span-1">
                    <label class="block">Valor</label>
                    <input v-model="value" type="number" class="border rounded px-2 py-1 w-full bg-gray-100">
                </div>
                <div class="md:col-span-2">
                    <label class="block">Descrição:</label>
                    <textarea v-model="description" rows="2" class="border rounded px-2 py-1 w-full"></textarea>
                </div>
                <div class="flex justify-end gap-2 md:col-span-2">
                    <button type="button" class="bg-gray-400 text-white px-4 rounded" @click="closeModal()">
                        cancelar
                    </button>
                    <button type="button" @click="saveTransaction()" class="bg-green-600 text-white px-4 rounded">
                        salvar
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>

import { ref } from "vue";
import { createTransaction } from "../services/api";

const emit = defineEmits(["close", "transaction-created"]);

const type = ref("debit");
const installments = ref(1)

const value = ref("");
const date = ref("");
const category = ref("");
const description = ref("");

async function saveTransaction() {
    const newTransaction = {
        type: type.value,
        description: description.value,
        value: parseFloat(value.value),
        date: date.value,
        category: category.value,
        installment: {
            total: parseInt(installments.value),
            current: 1
        }
    };

    try {
        await createTransaction(newTransaction);
        emit("transaction-created")
        closeModal();
    } catch (error) {
        console.error("Erro ao salvar:", error)
    }

}

function closeModal() {
    emit("close");
}
</script>