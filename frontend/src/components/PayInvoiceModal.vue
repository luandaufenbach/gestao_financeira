<template>
  <div
    class="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pay-invoice-title"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-md">
      <div class="flex items-center justify-between mb-4">
        <h2 id="pay-invoice-title" class="text-xl font-semibold text-slate-900">
          Registrar pagamento
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <div class="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 mb-4 text-sm">
        <p class="font-medium text-slate-800">Fatura de {{ invoice.label }}</p>
        <p class="text-xs text-slate-500 mt-0.5">
          Total {{ formatCurrency(invoice.totalInCents) }} · vence
          {{ formatDate(invoice.dueDate) }}
        </p>
        <p v-if="invoice.paidInCents > 0" class="text-xs text-slate-500">
          Já pago {{ formatCurrency(invoice.paidInCents) }} · falta
          {{ formatCurrency(invoice.remainingInCents) }}
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label for="pay-amount" class="block text-sm font-medium text-slate-600 mb-1">
            Valor
          </label>
          <input
            id="pay-amount"
            v-model="amount"
            type="number"
            step="0.01"
            min="0"
            required
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-300"
          />

          <!--
            O pagamento parcial/antecipado é um caso de uso real, não um erro:
            adiantar um pedaço da fatura para "não misturar" com o resto.
            Por isso o valor vem preenchido com o que falta, mas é editável.
          -->
          <div class="flex gap-2 mt-2">
            <button
              type="button"
              class="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 py-1 transition-colors cursor-pointer"
              @click="amount = centsToInputValue(invoice.remainingInCents)"
            >
              Valor total ({{ formatCurrency(invoice.remainingInCents) }})
            </button>
          </div>
        </div>

        <div>
          <label for="pay-date" class="block text-sm font-medium text-slate-600 mb-1">
            Data do pagamento
          </label>
          <input
            id="pay-date"
            v-model="date"
            type="date"
            required
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-300"
          />
        </div>

        <div>
          <label for="pay-description" class="block text-sm font-medium text-slate-600 mb-1">
            Descrição
          </label>
          <input
            id="pay-description"
            v-model="description"
            type="text"
            maxlength="200"
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-300"
          />
        </div>

        <p class="text-xs text-slate-400">
          O pagamento sai do seu saldo disponível, mas não conta como despesa — ela já foi
          registrada em cada compra do cartão.
        </p>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {{ saving ? "Salvando..." : "Registrar" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { createTransaction } from "@/services/api";
import { useFormatters } from "@/services/useFormatters";

const props = defineProps({
  card: { type: Object, required: true },
  invoice: { type: Object, required: true },
});

const emit = defineEmits(["close", "paid"]);

const { formatCurrency, formatDate, parseCurrencyToCents, centsToInputValue } = useFormatters();

// Sugere o que falta pagar e a data de hoje — os valores mais prováveis.
const amount = ref(centsToInputValue(props.invoice.remainingInCents));
const date = ref(new Date().toISOString().slice(0, 10));
const description = ref(`Fatura ${props.card.name}`);

const saving = ref(false);
const errorMessage = ref("");

async function submit() {
  errorMessage.value = "";

  const cents = parseCurrencyToCents(amount.value);

  if (cents === null || cents <= 0) {
    errorMessage.value = "Informe um valor maior que zero.";
    return;
  }

  saving.value = true;

  try {
    await createTransaction({
      type: "invoice_payment",
      description: description.value.trim() || "Pagamento da fatura",
      totalValueInCents: cents,
      date: date.value,
      bankCard: props.card._id,
      invoiceCycle: props.invoice.cycle,
    });

    emit("paid");
  } catch (error) {
    errorMessage.value = error.displayMessage ?? "Erro ao registrar o pagamento.";
  } finally {
    saving.value = false;
  }
}
</script>
