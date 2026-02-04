<template>
    <div class="p-6 space-y-6">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MonthlyBalanceCard />
            <CreditCardInvoiceCard />
            <SavedMoneyCard />
        </div>
        <TransactionsList />
    </div>
</template>

<script setup>
import CreditCardInvoiceCard from "../components/cards/CreditCardInvoiceCard .vue";
import MonthlyBalanceCard from "../components/cards/MonthlyBalanceCard.vue";
import SavedMoneyCard from "../components/cards/SavedMoneyCard.vue";
import TransactionsList from "../components/TransactionsList.vue";
</script>
