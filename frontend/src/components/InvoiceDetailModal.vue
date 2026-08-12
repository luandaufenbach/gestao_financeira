<template>
  <div
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="invoice-title"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
    >
      <div class="flex items-start justify-between mb-4">
        <div>
          <!--
            Sem `capitalize`: a classe maiusculiza CADA palavra e o título
            virava "Fatura De Agosto De 2026". Como "Fatura" já começa a frase,
            o resto fica em minúscula naturalmente.
          -->
          <h2 id="invoice-title" class="text-xl font-semibold text-slate-900">
            Fatura de {{ invoice?.label ?? "..." }}
          </h2>
          <p v-if="invoice" class="text-sm text-slate-400 mt-0.5">
            fecha {{ formatDate(invoice.closingDate) }} · vence {{ formatDate(invoice.dueDate) }}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <p v-if="loading" class="text-sm text-slate-400 text-center py-10">Carregando...</p>

      <p v-else-if="error" class="text-sm text-red-600 text-center py-10">{{ error }}</p>

      <div v-else-if="invoice" class="flex-1 overflow-y-auto space-y-5">
        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div class="flex items-end justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-slate-400">Total</p>
              <p class="text-3xl font-bold text-slate-900">
                {{ formatCurrency(invoice.totalInCents) }}
              </p>
            </div>
            <span
              class="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded"
              :class="STATUS_STYLES[invoice.status].badge"
            >
              {{ STATUS_STYLES[invoice.status].label }}
            </span>
          </div>

          <div v-if="invoice.paidInCents > 0" class="mt-3 pt-3 border-t border-slate-200 text-sm">
            <div class="flex justify-between text-slate-500">
              <span>Pago</span>
              <span class="font-medium text-emerald-600">
                {{ formatCurrency(invoice.paidInCents) }}
              </span>
            </div>
            <div
              v-if="invoice.remainingInCents > 0"
              class="flex justify-between text-slate-500 mt-0.5"
            >
              <span>Falta</span>
              <span class="font-medium text-amber-600">
                {{ formatCurrency(invoice.remainingInCents) }}
              </span>
            </div>
          </div>
        </div>

        <!--
          O agrupamento por categoria é o que diferencia esta tela de um filtro
          na lista de transações: responde "do que é feita a minha fatura?".
        -->
        <section v-if="invoice.categories.length">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Por categoria
          </h3>
          <ul class="space-y-1.5">
            <li
              v-for="item in invoice.categories"
              :key="item.categoryId ?? item.category"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-3 h-3 rounded-full shrink-0"
                  :style="{ backgroundColor: item.color }"
                ></span>
                <span class="text-slate-700 truncate">{{ item.category }}</span>
                <span class="text-xs text-slate-400 shrink-0">
                  {{ item.count }} {{ item.count === 1 ? "compra" : "compras" }}
                </span>
              </div>
              <span class="text-slate-600 font-medium shrink-0">
                {{ formatCurrency(item.totalInCents) }}
              </span>
            </li>
          </ul>
        </section>

        <section v-if="invoice.transactions.length">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Compras
          </h3>
          <ul class="space-y-1">
            <li
              v-for="t in invoice.transactions"
              :key="t._id"
              class="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-slate-50 last:border-0"
            >
              <div class="min-w-0">
                <p class="text-slate-800 truncate">{{ t.description }}</p>
                <p class="text-xs text-slate-400">
                  {{ formatDate(t.date) }} · {{ formatCategory(t.category) }}
                  <span v-if="t.installment?.total > 1" class="text-blue-600 font-semibold">
                    {{ t.installment.current }}/{{ t.installment.total }}
                  </span>
                </p>
              </div>
              <span class="text-slate-700 font-medium shrink-0">
                {{ formatCurrency(t.valueInCents) }}
              </span>
            </li>
          </ul>
        </section>

        <section v-if="invoice.payments.length">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Pagamentos
          </h3>
          <ul class="space-y-1">
            <li
              v-for="p in invoice.payments"
              :key="p._id"
              class="flex items-center justify-between gap-3 text-sm py-1.5"
            >
              <div class="min-w-0">
                <p class="text-slate-800 truncate">{{ p.description }}</p>
                <p class="text-xs text-slate-400">{{ formatDate(p.date) }}</p>
              </div>
              <span class="text-emerald-600 font-medium shrink-0">
                {{ formatCurrency(p.valueInCents) }}
              </span>
            </li>
          </ul>
        </section>

        <p v-if="!invoice.transactions.length" class="text-sm text-slate-400 text-center py-8">
          Nenhuma compra nesta fatura.
        </p>
      </div>

      <div class="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-200">
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium cursor-pointer"
          @click="emit('close')"
        >
          Fechar
        </button>
        <button
          v-if="invoice && invoice.remainingInCents > 0"
          type="button"
          class="px-4 py-2 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors cursor-pointer"
          @click="emit('pay', invoice)"
        >
          Registrar pagamento
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getCardInvoice } from "@/services/api";
import { useFormatters } from "@/services/useFormatters";

const props = defineProps({
  /** O cartão inteiro, não só o id — o modal de pagamento precisa do nome. */
  card: { type: Object, required: true },
  cycle: { type: String, required: true },
});

const emit = defineEmits(["close", "pay"]);

const { formatCurrency, formatDate, formatCategory } = useFormatters();

const invoice = ref(null);
const loading = ref(true);
const error = ref("");

const STATUS_STYLES = {
  aberta: { label: "aberta", badge: "bg-sky-100 text-sky-700" },
  parcial: { label: "parcial", badge: "bg-amber-100 text-amber-700" },
  paga: { label: "paga", badge: "bg-emerald-100 text-emerald-700" },
  vencida: { label: "vencida", badge: "bg-red-100 text-red-700" },
  vazia: { label: "sem compras", badge: "bg-slate-100 text-slate-500" },
};

onMounted(async () => {
  try {
    invoice.value = await getCardInvoice(props.card._id, props.cycle);
  } catch (err) {
    error.value = err.displayMessage ?? "Erro ao carregar a fatura";
  } finally {
    loading.value = false;
  }
});
</script>
