<template>
  <div class="min-h-screen bg-slate-50">
    <Navbar />

    <main class="max-w-7xl mx-auto px-6 py-8">
      <nav class="inline-flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 border border-slate-200 mb-6">
        <RouterLink to="/dashboard"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-slate-900 shadow-sm">
          Dashboard
        </RouterLink>
        <RouterLink to="/transactions"
          class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          Transações
        </RouterLink>
        <RouterLink to="/goals"
          class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          Metas
        </RouterLink>
      </nav>

      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <button @click="previousMonth"
            class="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600">
            &#8249;
          </button>
          <span class="text-xl font-semibold text-slate-800 min-w-32 text-center capitalize">
            {{ monthLabel }}
          </span>
          <button @click="nextMonth"
            class="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600">
            &#8250;
          </button>
        </div>

        <button @click="showModal = true"
          class="group inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200">
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none">+</span>
          Nova transação
        </button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">

        <div class="xl:col-span-3 flex flex-col gap-6">

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MonthlyBalanceCard ref="balanceCard" :year="selectedYear" :month="selectedMonth" />
            <CreditCardInvoiceCard ref="invoiceCard" :year="selectedYear" :month="selectedMonth" />
            <GoalsCard ref="goalsCard" :year="selectedYear" :month="selectedMonth" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TransactionsList ref="transactionsList" :year="selectedYear" :month="selectedMonth" :limit="4"
              :show-view-more="true" view-more-to="/transactions" @transaction-deleted="refreshAll"
              @transaction-updated="refreshAll" />
            <CategoryPieChart ref="pieChart" :year="selectedYear" :month="selectedMonth" />
          </div>

        </div>

        <div class="xl:col-span-1">
          <MyCardsCard />
        </div>

      </div>
    </main>

    <NewTransactionalModal v-if="showModal" :year="selectedYear" :month="selectedMonth"
      @transaction-created="handleTransactionCreated" @close="showModal = false" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import Navbar from "../components/navbar.vue";
import MonthlyBalanceCard from "../components/cards/MonthlyBalanceCard.vue";
import CreditCardInvoiceCard from "../components/cards/CreditCardInvoiceCard.vue";
import GoalsCard from "../components/cards/GoalsCard.vue";
import CategoryPieChart from "../components/CategoryPieChart.vue";
import MyCardsCard from "../components/cards/MyCardsCard.vue";
import TransactionsList from "../components/TransactionsList.vue";
import NewTransactionalModal from "../components/NewTransactionalModal.vue";
import { useMonthNavigation } from "../services/useMonthNavigation";

const showModal = ref(false);
const transactionsList = ref(null);
const balanceCard = ref(null);
const invoiceCard = ref(null);
const goalsCard = ref(null);
const pieChart = ref(null);

const { selectedYear, selectedMonth, monthLabel, previousMonth: basePreviousMonth, nextMonth: baseNextMonth } = useMonthNavigation();

function refreshAll() {
  transactionsList.value?.loadTransactions();
  balanceCard.value?.refetch?.();
  invoiceCard.value?.refetch?.();
  goalsCard.value?.refetch?.();
  pieChart.value?.refetch?.();
}

function previousMonth() {
  basePreviousMonth();
  refreshAll();
}

function nextMonth() {
  baseNextMonth();
  refreshAll();
}

function handleTransactionCreated() {
  refreshAll();
  showModal.value = false;
}
</script>
