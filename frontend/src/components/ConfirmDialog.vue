<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="emit('cancel')"
    >
      <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 :id="titleId" class="text-lg font-bold text-slate-800 mb-2">{{ title }}</h3>
        <p class="text-sm text-slate-500 mb-6">
          <slot>{{ message }}</slot>
        </p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm transition-colors cursor-pointer"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            ref="confirmButton"
            type="button"
            :disabled="busy"
            class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm transition-colors disabled:opacity-60 cursor-pointer"
            @click="emit('confirm')"
          >
            {{ busy ? "Aguarde..." : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * Diálogo de confirmação reutilizável.
 *
 * MOTIVO (M2): este mesmo bloco estava copiado em quatro arquivos — Goals.vue,
 * Transactions.vue, TransactionsList.vue e CategoriesModal.vue — apesar de já
 * existir o composable useDeleteConfirmation, usado em apenas dois deles.
 *
 * De quebra, a versão duplicada não tinha nenhum tratamento de acessibilidade:
 * sem role/aria, sem foco inicial e sem fechar no Esc.
 */
import { ref, watch, nextTick, useId } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "Confirmar exclusão" },
  message: { type: String, default: "Esta ação não pode ser desfeita." },
  confirmLabel: { type: String, default: "Excluir" },
  cancelLabel: { type: String, default: "Cancelar" },
  busy: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm", "cancel"]);

const titleId = useId();
const confirmButton = ref(null);

function onKeydown(event) {
  if (event.key === "Escape") emit("cancel");
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      window.addEventListener("keydown", onKeydown);
      await nextTick();
      confirmButton.value?.focus();
    } else {
      window.removeEventListener("keydown", onKeydown);
    }
  }
);
</script>
