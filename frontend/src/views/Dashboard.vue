<template>
  <div class="min-h-screen bg-slate-50">
    <Navbar />

    <main class="max-w-7xl mx-auto px-6 py-8">
      <AppTabs class="mb-6" />

      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <button
            type="button"
            aria-label="Mês anterior"
            class="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 cursor-pointer"
            @click="previousMonth"
          >
            &#8249;
          </button>
          <span class="text-xl font-semibold text-slate-800 min-w-32 text-center capitalize">
            {{ monthLabel }}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            class="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 cursor-pointer"
            @click="nextMonth"
          >
            &#8250;
          </button>
        </div>

        <button
          type="button"
          class="group inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-400 px-5 py-2 text-slate-900 font-semibold shadow-sm transition-all hover:bg-lime-300 hover:border-lime-200 cursor-pointer"
          @click="showModal = true"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-lime-300 text-sm leading-none"
            >+</span
          >
          Nova transação
        </button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div class="xl:col-span-3 flex flex-col gap-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MonthlyBalanceCard ref="balanceCard" :year="selectedYear" :month="selectedMonth" />
            <InvoicesCard
              ref="invoicesCard"
              @open-invoice="openInvoice"
              @pay-invoice="openPayment"
            />
            <GoalsCard ref="goalsCard" />
          </div>

          <!--
            A altura da linha é ditada pelo card de categorias, que lista todas
            as categorias sem cortar. A lista de transações (fit-to-height) se
            estica junto e preenche essa altura com quantas transações couberem.
          -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <TransactionsList
              ref="transactionsList"
              :year="selectedYear"
              :month="selectedMonth"
              :limit="40"
              fit-to-height
              @transaction-deleted="refreshAll"
              @transaction-updated="refreshAll"
            />
            <CategoryPieChart ref="pieChart" :year="selectedYear" :month="selectedMonth" />
          </div>
        </div>

        <!--
          self-start: a coluna dos cartões tem altura própria. Sem isso ela é
          esticada até a altura da coluna da esquerda e o card fica com um
          vazio enorme embaixo dos cartões.
        -->
        <div class="xl:col-span-1 self-start">
          <MyCardsCard />
        </div>
      </div>
    </main>

    <NewTransactionalModal
      v-if="showModal"
      :year="selectedYear"
      :month="selectedMonth"
      @transaction-created="handleTransactionCreated"
      @close="showModal = false"
    />

    <InvoiceDetailModal
      v-if="detailTarget"
      :card="detailTarget.card"
      :cycle="detailTarget.cycle"
      @close="detailTarget = null"
      @pay="payFromDetail"
    />

    <PayInvoiceModal
      v-if="paymentTarget"
      :card="paymentTarget.card"
      :invoice="paymentTarget.invoice"
      @close="paymentTarget = null"
      @paid="handleInvoicePaid"
    />
  </div>
</template>

<script setup>
import { ref, useTemplateRef } from "vue";
import Navbar from "../components/navbar.vue";
import AppTabs from "../components/AppTabs.vue";
import MonthlyBalanceCard from "../components/cards/MonthlyBalanceCard.vue";
import InvoicesCard from "../components/cards/InvoicesCard.vue";
import InvoiceDetailModal from "../components/InvoiceDetailModal.vue";
import PayInvoiceModal from "../components/PayInvoiceModal.vue";
import GoalsCard from "../components/cards/GoalsCard.vue";
import CategoryPieChart from "../components/CategoryPieChart.vue";
import MyCardsCard from "../components/cards/MyCardsCard.vue";
import TransactionsList from "../components/TransactionsList.vue";
import NewTransactionalModal from "../components/NewTransactionalModal.vue";
import { useMonthNavigation } from "../services/useMonthNavigation";

const showModal = ref(false);

/** { cardId, cycle } da fatura aberta em detalhe, ou null. */
const detailTarget = ref(null);

/** { card, invoice } do pagamento em andamento, ou null. */
const paymentTarget = ref(null);

const transactionsList = useTemplateRef("transactionsList");
const balanceCard = useTemplateRef("balanceCard");
const invoicesCard = useTemplateRef("invoicesCard");
const goalsCard = useTemplateRef("goalsCard");
const pieChart = useTemplateRef("pieChart");

/**
 * BUG CORRIGIDO (A5 — requisições duplicadas):
 *
 * Antes, previousMonth/nextMonth chamavam refreshAll() logo depois de mudar o
 * mês. Só que os cards JÁ observam as props year/month e recarregam sozinhos
 * (ver useCardFetch). Resultado: cada clique de navegação disparava DUAS
 * requisições por card — cinco cards, dez requisições por clique.
 *
 * Agora a troca de mês apenas altera o estado; os filhos reagem via props.
 * O refreshAll() ficou reservado para o que as props não cobrem: uma
 * transação criada ou excluída, que muda os totais sem mudar o mês.
 */
const { selectedYear, selectedMonth, monthLabel, previousMonth, nextMonth } = useMonthNavigation();

function refreshAll() {
  transactionsList.value?.loadTransactions();
  balanceCard.value?.refetch();
  invoicesCard.value?.refetch();
  goalsCard.value?.refetch();
  pieChart.value?.refetch();
}

function handleTransactionCreated() {
  showModal.value = false;
  refreshAll();
}

function openInvoice(target) {
  detailTarget.value = target;
}

function openPayment({ card, invoice }) {
  paymentTarget.value = { card, invoice };
}

/** Vindo do detalhe: fecha o detalhe e abre o pagamento no lugar. */
function payFromDetail(invoice) {
  const { card } = detailTarget.value;
  detailTarget.value = null;
  paymentTarget.value = { card, invoice };
}

function handleInvoicePaid() {
  paymentTarget.value = null;
  detailTarget.value = null;
  refreshAll();
}
</script>
