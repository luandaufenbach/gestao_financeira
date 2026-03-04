<template>
    <Navbar />
    <div class="p-6 space-y-6">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MonthlyBalanceCard ref="balanceCard" />
            <CreditCardInvoiceCard ref="invoiceCard" />
            <SavedMoneyCard ref="savingsCard" />
        </div>
        <div class="flex justify-end">
            <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" @click="showModal = true">
                Nova transação
            </button>
        </div>
        <TransactionsList ref="transactionsList" @transaction-deleted="refreshAll" @transaction-updated="refreshAll"/>
        <NewTransactionalModal v-if="showModal" @transaction-created="handleTransactionCreated"
            @close="showModal = false" />
    </div>
</template>

<script setup>
import CreditCardInvoiceCard from "../components/cards/CreditCardInvoiceCard.vue";
import MonthlyBalanceCard from "../components/cards/MonthlyBalanceCard.vue";
import SavedMoneyCard from "../components/cards/SavedMoneyCard.vue";
import TransactionsList from "../components/TransactionsList.vue";
import NewTransactionalModal from "../components/NewTransactionalModal.vue";

import { ref } from "vue";
import Navbar from "../components/navbar.vue";

const showModal = ref(false);
const transactionsList = ref(null);
const balanceCard = ref(null);
const invoiceCard = ref(null);
const savingsCard = ref(null);

function refreshAll() {
    transactionsList.value?.loadTransactions();
    balanceCard.value?.refetch?.();
    invoiceCard.value?.refetch?.();
    savingsCard.value?.refetch?.();
}

function handleTransactionCreated() {
    refreshAll();
    showModal.value = false;
}

</script>
