<template>
  <li
    class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
        :class="style.bg"
      >
        {{ style.icon }}
      </div>
      <div class="min-w-0">
        <p class="font-medium text-slate-800 text-sm truncate">{{ transaction.description }}</p>
        <p class="text-xs text-slate-400 truncate">
          {{ formatDate(transaction.date) }} · {{ formatSource(transaction) }}
          <template v-if="showType"> · {{ formatType(transaction.type) }}</template>
          <span v-if="transaction.installment?.total > 1" class="ml-1 text-blue-600 font-semibold">
            {{ transaction.installment.current }}/{{ transaction.installment.total }}
          </span>
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <span class="font-semibold text-sm" :class="amountColor(transaction.type)">
        {{ amountSign(transaction.type) }} {{ formatCurrency(transaction.valueInCents) }}
      </span>

      <button
        type="button"
        aria-label="Editar transação"
        class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        @click="emit('edit', transaction)"
      >
        <PencilIcon class="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Excluir transação"
        class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
        @click="emit('delete', transaction)"
      >
        <TrashIcon class="w-4 h-4" />
      </button>
    </div>
  </li>
</template>

<script setup>
/**
 * Uma linha de transação, do jeito que o dashboard desenha.
 *
 * MOTIVO: a marcação da linha existia duas vezes — no card do dashboard e na
 * página de Transações — e as duas cópias já tinham divergido de escala. A
 * página usava text-xl na descrição e text-3xl no valor, contra text-sm em
 * ambos no dashboard, o que fazia as duas telas parecerem de aplicativos
 * diferentes. Com um componente só, elas não têm como divergir de novo.
 */
import { computed } from "vue";
import { PencilIcon, TrashIcon } from "@heroicons/vue/24/solid";
import { useFormatters } from "../services/useFormatters";

const props = defineProps({
  transaction: { type: Object, required: true },
  /**
   * Mostra o tipo na legenda. Ligado na página de Transações, onde a lista
   * mistura todos os tipos; desligado no dashboard, onde o ícone já basta e o
   * espaço é curto.
   */
  showType: { type: Boolean, default: false },
});

const emit = defineEmits(["edit", "delete"]);

const { formatCurrency, formatDate, formatSource, formatType, amountColor, amountSign } =
  useFormatters();

const TYPE_STYLES = {
  income: { icon: "↑", bg: "bg-green-100 text-green-700" },
  debit: { icon: "↓", bg: "bg-red-100 text-red-600" },
  credit: { icon: "💳", bg: "bg-amber-100 text-amber-600" },
  savings: { icon: "🏦", bg: "bg-blue-100 text-blue-600" },
  // Mesma família visual do "guardado", com a seta invertida: é o caminho de
  // volta da reserva para a conta.
  withdrawal: { icon: "↩", bg: "bg-sky-100 text-sky-700" },
  invoice_payment: { icon: "🧾", bg: "bg-amber-100 text-amber-700" },
};

const style = computed(
  () => TYPE_STYLES[props.transaction.type] ?? { icon: "·", bg: "bg-slate-100 text-slate-500" }
);
</script>
