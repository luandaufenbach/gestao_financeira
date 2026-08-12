<template>
  <div>
    <label :for="`${uid}-type`" class="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
    <select
      :id="`${uid}-type`"
      v-model="type"
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300 cursor-pointer"
    >
      <option value="debit">Débito</option>
      <option value="credit">Crédito</option>
      <option value="income">Adicionar saldo</option>
      <option value="savings">Guardar valor</option>
      <option value="withdrawal">Resgatar guardado</option>
    </select>
  </div>

  <div>
    <label :for="`${uid}-date`" class="block text-sm font-medium text-slate-600 mb-1">Data</label>
    <input
      :id="`${uid}-date`"
      v-model="date"
      type="date"
      required
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
    />
  </div>

  <div v-if="requiresCategory">
    <label :for="`${uid}-category`" class="block text-sm font-medium text-slate-600 mb-1"
      >Categoria</label
    >
    <select
      :id="`${uid}-category`"
      v-model="categoryId"
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300 cursor-pointer"
    >
      <option value="">Selecione uma categoria</option>
      <option v-for="category in categories" :key="category._id" :value="category._id">
        {{ category.name }}
      </option>
    </select>
    <p v-if="!categories.length" class="text-xs text-amber-600 mt-1">
      Nenhuma categoria cadastrada. Crie uma na tela de Transações.
    </p>
  </div>

  <!--
    BUG CORRIGIDO: este campo não existia.

    O payload já mandava `bankCard`, mas nenhuma tela o preenchia, então toda
    compra no crédito era salva sem cartão. Como a fatura é montada filtrando
    pelo cartão, as compras simplesmente não apareciam nela — sem erro, sem
    aviso, só um card de Faturas vazio.
  -->
  <div v-if="requiresBankCard">
    <label :for="`${uid}-card`" class="block text-sm font-medium text-slate-600 mb-1">Cartão</label>
    <select
      :id="`${uid}-card`"
      v-model="bankCardId"
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300 cursor-pointer"
    >
      <option value="">Selecione o cartão</option>
      <option v-for="card in creditCards" :key="card._id" :value="card._id">
        {{ card.bank || card.name }}
        <template v-if="card.lastFourDigits">· {{ card.lastFourDigits }}</template>
      </option>
    </select>
    <p v-if="!creditCards.length" class="text-xs text-amber-600 mt-1">
      Nenhum cartão de crédito cadastrado. Adicione um no Dashboard, em "Meus cartões".
    </p>
  </div>

  <div v-if="supportsInstallments">
    <label :for="`${uid}-installments`" class="block text-sm font-medium text-slate-600 mb-1">
      Parcelas
    </label>
    <input
      :id="`${uid}-installments`"
      v-model.number="installments"
      type="number"
      min="1"
      :max="MAX_INSTALLMENTS"
      :disabled="lockInstallments"
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300 disabled:bg-slate-50 disabled:text-slate-400"
    />
    <p v-if="lockInstallments" class="text-xs text-slate-400 mt-1">
      O número de parcelas não pode ser alterado após a criação.
    </p>
  </div>

  <div>
    <label :for="`${uid}-amount`" class="block text-sm font-medium text-slate-600 mb-1">
      {{ isInstallmentPurchase ? "Valor total da compra" : "Valor" }}
    </label>
    <input
      :id="`${uid}-amount`"
      v-model="amount"
      type="number"
      step="0.01"
      min="0"
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
    />
    <p v-if="isInstallmentPurchase && perInstallment" class="text-xs text-slate-500 mt-1">
      {{ installments }}x de aproximadamente {{ perInstallment }}
    </p>
  </div>

  <div class="md:col-span-2">
    <label :for="`${uid}-description`" class="block text-sm font-medium text-slate-600 mb-1">
      Descrição
    </label>
    <textarea
      :id="`${uid}-description`"
      v-model="description"
      rows="2"
      maxlength="200"
      class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
      placeholder="Ex: Mercado da semana"
    ></textarea>
  </div>
</template>

<script setup>
/**
 * Campos compartilhados entre o modal de criação e o de edição.
 *
 * MOTIVO: os dois modais tinham o mesmo formulário copiado linha a linha —
 * cerca de 60 linhas de template idênticas. Qualquer campo novo precisava ser
 * adicionado nos dois, e eles já haviam divergido (o de edição tinha perdido a
 * classe cursor-pointer no select de categoria).
 *
 * O rótulo do valor muda conforme o contexto: em compra parcelada fica
 * explícito que se trata do VALOR TOTAL — o ponto exato onde nascia o bug C1.
 */
import { computed, onMounted, useId, watch } from "vue";
import { useFormatters } from "../services/useFormatters";
import { useBankCards } from "../stores/bankCards";

const props = defineProps({
  /** O objeto retornado por useTransactionForm(). */
  form: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  /** Na edição, o número de parcelas é somente leitura (ver bug M8). */
  lockInstallments: { type: Boolean, default: false },
});

/**
 * As refs são desestruturadas aqui, no setup, e não acessadas como
 * `form.type` no template: o Vue só desempacota refs automaticamente quando
 * elas são bindings de nível superior do setup. Uma ref aninhada dentro de um
 * objeto chegaria ao v-model como o objeto Ref, não como o valor.
 */
const { type, description, amount, date, categoryId, bankCardId, installments, MAX_INSTALLMENTS } =
  props.form;

const requiresCategory = props.form.requiresCategory;
const requiresBankCard = props.form.requiresBankCard;
const supportsInstallments = props.form.supportsInstallments;

const { creditCards, load: loadCards } = useBankCards();

onMounted(loadCards);

/**
 * Com um cartão só, escolher não é decisão — é digitação. Seleciona sozinho,
 * e o campo continua visível para deixar claro onde a compra foi lançada.
 */
watch(
  [requiresBankCard, creditCards],
  () => {
    if (requiresBankCard.value && !bankCardId.value && creditCards.value.length === 1) {
      bankCardId.value = creditCards.value[0]._id;
    }
  },
  { immediate: true }
);

const uid = useId();
const { formatCurrency, parseCurrencyToCents } = useFormatters();

const isInstallmentPurchase = computed(
  () => supportsInstallments.value && Number(installments.value) > 1
);

/** Prévia do valor de cada parcela, para o usuário conferir antes de salvar. */
const perInstallment = computed(() => {
  const totalCents = parseCurrencyToCents(amount.value);
  const count = Number(installments.value);

  if (totalCents === null || !count || count < 1) return "";

  return formatCurrency(Math.floor(totalCents / count));
});
</script>
