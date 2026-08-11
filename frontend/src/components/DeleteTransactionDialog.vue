<template>
  <Teleport to="body">
    <div
      v-if="transaction"
      class="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-transaction-title"
      @click.self="emit('cancel')"
    >
      <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h3 id="delete-transaction-title" class="text-lg font-bold text-slate-800 mb-2">
          Confirmar exclusão
        </h3>

        <p class="text-sm text-slate-500 mb-4">
          <template v-if="isInstallment">
            <strong>{{ transaction.description }}</strong> é a parcela
            {{ transaction.installment.current }} de {{ transaction.installment.total }}. O que você
            quer excluir?
          </template>
          <template v-else>
            Deseja realmente excluir <strong>{{ transaction.description }}</strong
            >?
          </template>
        </p>

        <!--
          BUG CORRIGIDO (C3): antes este diálogo perguntava apenas "Deseja
          realmente excluir esta transação?" — e o backend apagava TODAS as
          parcelas do grupo. O usuário perdia 12 lançamentos achando que
          apagava um. Agora a escolha é explícita e o padrão é a opção menos
          destrutiva.
        -->
        <fieldset v-if="isInstallment" class="space-y-2 mb-6">
          <label class="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input v-model="scope" type="radio" value="single" class="mt-1" />
            <span>
              <strong>Somente esta parcela</strong>
              <span class="block text-xs text-slate-400">
                As outras {{ transaction.installment.total - 1 }} continuam registradas.
              </span>
            </span>
          </label>
          <label class="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input v-model="scope" type="radio" value="group" class="mt-1" />
            <span>
              <strong>A compra inteira</strong>
              <span class="block text-xs text-slate-400">
                Exclui as {{ transaction.installment.total }} parcelas de uma vez.
              </span>
            </span>
          </label>
        </fieldset>

        <p v-if="error" class="text-sm text-red-600 mb-4">{{ error }}</p>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm transition-colors cursor-pointer"
            @click="emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="busy"
            class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm transition-colors disabled:opacity-60 cursor-pointer"
            @click="emit('confirm', scope)"
          >
            {{ busy ? "Excluindo..." : "Excluir" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  /** A transação a excluir, ou null quando o diálogo está fechado. */
  transaction: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

const emit = defineEmits(["confirm", "cancel"]);

const scope = ref("single");

const isInstallment = computed(() => (props.transaction?.installment?.total ?? 1) > 1);

// Volta sempre ao padrão conservador ao abrir para outra transação.
watch(
  () => props.transaction,
  () => {
    scope.value = "single";
  }
);
</script>
