<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Faturas</span>

      <!--
        Seletor de cartão. Com um cartão só ele fica escondido; a estrutura já
        está pronta para quando houver mais de um.
      -->
      <select
        v-if="creditCards.length > 1"
        v-model="selectedCardId"
        aria-label="Cartão"
        class="text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-600 cursor-pointer"
      >
        <option v-for="card in creditCards" :key="card._id" :value="card._id">
          {{ card.bank || card.name }}
        </option>
      </select>
      <span v-else-if="currentCard" class="text-xs font-medium text-slate-500">
        {{ currentCard.bank || currentCard.name }}
      </span>
    </div>

    <p v-if="loading" class="text-sm text-slate-400 text-center py-6">Carregando...</p>

    <!--
      Sem cartão de crédito, ou com o ciclo não configurado, o card explica o
      que fazer em vez de mostrar uma lista vazia sem motivo aparente.
    -->
    <div v-else-if="!creditCards.length" class="text-sm text-slate-400 text-center py-6">
      Nenhum cartão de crédito cadastrado.
    </div>

    <div v-else-if="needsCycleSetup" class="text-sm text-slate-500 py-4 space-y-2">
      <p>Para montar as faturas, informe quando o cartão fecha e quando vence.</p>
      <p class="text-xs text-slate-400">Você configura isso no cartão, em "Meus cartões".</p>
    </div>

    <p v-else-if="error" class="text-sm text-red-600 text-center py-6">{{ error }}</p>

    <ul v-else class="flex flex-col gap-2">
      <li v-for="invoice in visibleInvoices" :key="invoice.cycle">
        <button
          type="button"
          class="w-full text-left rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
          @click="emit('open-invoice', { card: currentCard, cycle: invoice.cycle })"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-slate-800 text-sm capitalize">
              {{ shortLabel(invoice) }}
            </span>
            <span class="font-semibold text-slate-800 text-sm">
              {{ formatCurrency(invoice.totalInCents) }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-2 mt-1">
            <span class="text-xs text-slate-400">{{ datesLabel(invoice) }}</span>
            <span
              class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              :class="STATUS_STYLES[invoice.status].badge"
            >
              {{ STATUS_STYLES[invoice.status].label }}
            </span>
          </div>

          <!-- Barra de progresso do pagamento, só quando há algo pago a menos. -->
          <div v-if="invoice.status === 'parcial'" class="mt-2">
            <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full bg-amber-400"
                :style="{ width: paidPercent(invoice) + '%' }"
              ></div>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              {{ formatCurrency(invoice.paidInCents) }} pagos · faltam
              {{ formatCurrency(invoice.remainingInCents) }}
            </p>
          </div>
        </button>
      </li>
    </ul>

    <button
      v-if="openInvoice && !needsCycleSetup"
      type="button"
      class="w-full rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-300 transition-colors cursor-pointer"
      @click="emit('pay-invoice', { card: currentCard, invoice: openInvoice })"
    >
      Registrar pagamento
    </button>
  </div>
</template>

<script setup>
/**
 * Card de faturas do cartão de crédito.
 *
 * SUBSTITUI o antigo CreditCardInvoiceCard, que mostrava um único número — a
 * soma das compras de crédito do mês do calendário. Aquele número nunca batia
 * com o do banco, porque a fatura real segue o ciclo de FECHAMENTO, não o mês.
 * Além disso não tinha status nem como ver o que havia dentro.
 */
import { ref, computed, watch, onMounted } from "vue";
import { getCardInvoices } from "@/services/api";
import { useBankCards } from "@/stores/bankCards";
import { useFormatters } from "@/services/useFormatters";

const emit = defineEmits(["open-invoice", "pay-invoice"]);

const { formatCurrency, formatDate } = useFormatters();

// Mesma lista dos outros dois lugares que mostram cartões: um GET atende os
// três, e um cartão cadastrado em "Meus cartões" já aparece aqui.
const { creditCards, load: loadBankCards } = useBankCards();

const invoices = ref([]);
const selectedCardId = ref("");
const loading = ref(false);
const error = ref("");

const STATUS_STYLES = {
  aberta: { label: "aberta", badge: "bg-sky-100 text-sky-700" },
  parcial: { label: "parcial", badge: "bg-amber-100 text-amber-700" },
  paga: { label: "paga", badge: "bg-emerald-100 text-emerald-700" },
  vencida: { label: "vencida", badge: "bg-red-100 text-red-700" },
  vazia: { label: "sem compras", badge: "bg-slate-100 text-slate-500" },
};

const currentCard = computed(
  () => creditCards.value.find((card) => card._id === selectedCardId.value) ?? null
);

/** O cartão existe mas ainda não tem os dias de fechamento/vencimento. */
const needsCycleSetup = computed(
  () => Boolean(currentCard.value) && (!currentCard.value.closingDay || !currentCard.value.dueDay)
);

/**
 * Quantas faturas o card mostra. Empilhar o histórico inteiro estica o card e
 * afoga o que interessa, que são as faturas recentes. A lista completa fica
 * para uma tela dedicada.
 */
const VISIBLE_INVOICES = 3;

/**
 * Faturas vazias do futuro não interessam — só poluem a lista. Mas a fatura
 * aberta atual aparece mesmo sem compras, para o usuário ver que está zerada.
 *
 * O corte vem DEPOIS do filtro, e a busca traz mais que VISIBLE_INVOICES de
 * propósito: cortando antes, um ciclo vazio no meio gastaria uma das três
 * vagas e o card mostraria menos faturas do que cabe.
 */
const visibleInvoices = computed(() =>
  invoices.value
    .filter((invoice, index) => index === 0 || invoice.status !== "vazia")
    .slice(0, VISIBLE_INVOICES)
);

/** A fatura que ainda pode receber pagamento (a mais recente não quitada). */
const openInvoice = computed(() =>
  invoices.value.find((invoice) => ["aberta", "parcial", "vencida"].includes(invoice.status))
);

const paidPercent = (invoice) =>
  invoice.totalInCents > 0
    ? Math.min(100, Math.round((invoice.paidInCents / invoice.totalInCents) * 100))
    : 0;

/** "agosto de 2026" -> "agosto" quando é do ano corrente. */
function shortLabel(invoice) {
  const currentYear = new Date().getUTCFullYear();
  const invoiceYear = Number(invoice.cycle.slice(0, 4));
  return invoiceYear === currentYear ? invoice.label.replace(/ de \d{4}$/, "") : invoice.label;
}

function datesLabel(invoice) {
  const closing = formatDate(invoice.closingDate).slice(0, 5);
  const due = formatDate(invoice.dueDate).slice(0, 5);
  return `fecha ${closing} · vence ${due}`;
}

async function loadCards() {
  await loadBankCards();

  if (!selectedCardId.value && creditCards.value.length > 0) {
    selectedCardId.value = creditCards.value[0]._id;
  }
}

async function loadInvoices() {
  if (!selectedCardId.value || needsCycleSetup.value) {
    invoices.value = [];
    return;
  }

  error.value = "";

  try {
    const data = await getCardInvoices(selectedCardId.value, 6);
    invoices.value = data.invoices ?? [];
  } catch (err) {
    error.value = err.displayMessage ?? "Erro ao carregar faturas";
    invoices.value = [];
  }
}

async function refetch() {
  loading.value = true;
  try {
    await loadCards();
    await loadInvoices();
  } catch (err) {
    error.value = err.displayMessage ?? "Erro ao carregar cartões";
  } finally {
    loading.value = false;
  }
}

watch(selectedCardId, loadInvoices);
onMounted(refetch);

defineExpose({ refetch });
</script>
