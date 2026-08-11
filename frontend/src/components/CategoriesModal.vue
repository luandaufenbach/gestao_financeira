<template>
  <div
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="categories-title"
    @click.self="closeModal"
  >
    <div
      class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
    >
      <div class="flex items-center justify-between mb-5">
        <h2 id="categories-title" class="text-xl font-semibold text-slate-900">
          Gerenciar Categorias
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Criar nova categoria</h3>

          <form class="grid grid-cols-1 md:grid-cols-3 gap-3" @submit.prevent="saveCategory">
            <div>
              <label for="category-name" class="block text-sm font-medium text-slate-600 mb-1"
                >Nome</label
              >
              <input
                id="category-name"
                v-model="form.name"
                type="text"
                placeholder="Ex: Passeio"
                maxlength="60"
                class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300"
              />
            </div>

            <div>
              <label for="category-color" class="block text-sm font-medium text-slate-600 mb-1"
                >Cor</label
              >
              <div class="flex items-center gap-2">
                <input
                  id="category-color"
                  v-model="form.color"
                  type="color"
                  class="w-full h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <span class="text-sm text-slate-500">{{ form.color }}</span>
              </div>
            </div>

            <div class="flex items-end">
              <button
                type="submit"
                :disabled="saving"
                class="w-full px-4 py-2.5 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {{ saving ? "Criando..." : "Criar" }}
              </button>
            </div>
          </form>

          <p v-if="errorMessage" class="text-sm text-red-600 mt-2">{{ errorMessage }}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-800 mb-3">
            {{ categories.length }} {{ categories.length === 1 ? "categoria" : "categorias" }}
          </h3>

          <div v-if="!categories.length" class="text-center py-8 text-slate-400">
            <p>Nenhuma categoria criada ainda.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="category in categories"
              :key="category._id"
              class="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div
                  class="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0"
                  :style="{ backgroundColor: category.color }"
                  :title="category.color"
                ></div>
                <div class="min-w-0">
                  <p class="font-semibold text-slate-800 truncate">{{ category.name }}</p>
                  <p class="text-xs text-slate-400">
                    Criada em {{ formatDate(category.createdAt) }}
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="ml-4 px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-medium text-sm shrink-0 cursor-pointer"
                @click="deleteConfirmation.open(category)"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium cursor-pointer"
          @click="closeModal"
        >
          Fechar
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="deleteConfirmation.isOpen.value"
      :busy="deleteConfirmation.busy.value"
      title="Deletar categoria"
      confirm-label="Deletar"
      @confirm="deleteConfirmation.confirm()"
      @cancel="deleteConfirmation.close()"
    >
      Deseja realmente deletar a categoria
      <strong>{{ deleteConfirmation.selected.value?.name }}</strong
      >?
      <span v-if="deleteConfirmation.error.value" class="block mt-2 text-red-600">
        {{ deleteConfirmation.error.value }}
      </span>
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useCategories } from "../stores/categories";
import { useDeleteConfirmation } from "../services/useDeleteConfirmation";
import { useFormatters } from "../services/useFormatters";
import ConfirmDialog from "./ConfirmDialog.vue";

const emit = defineEmits(["close"]);

/**
 * Store singleton: criar uma categoria aqui atualiza imediatamente o <select>
 * da tela por trás do modal. Na versão anterior, cada componente tinha sua
 * própria cópia da lista e a categoria nova só aparecia após recarregar a
 * página (bug A6).
 */
const { categories, load, create, remove } = useCategories();

// formatDate estava reimplementado neste arquivo, apesar de useFormatters
// existir justamente para isso.
const { formatDate } = useFormatters();

const deleteConfirmation = useDeleteConfirmation((category) => remove(category._id));

const saving = ref(false);
const errorMessage = ref("");

const form = reactive({ name: "", color: "#64748b" });

onMounted(load);

async function saveCategory() {
  errorMessage.value = "";

  if (form.name.trim().length < 2) {
    errorMessage.value = "Nome deve ter pelo menos 2 caracteres.";
    return;
  }

  saving.value = true;

  try {
    await create({ name: form.name.trim(), color: form.color });
    form.name = "";
    form.color = "#64748b";
  } catch (error) {
    // O backend responde 409 para nome duplicado (agora também ignorando
    // maiúsculas/minúsculas) — a mensagem chega pronta para exibir.
    errorMessage.value = error.displayMessage ?? "Erro ao criar categoria.";
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  emit("close");
}
</script>
