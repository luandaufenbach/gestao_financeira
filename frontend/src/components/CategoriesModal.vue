<template>
    <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
        <div
            class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">

            <div class="flex items-center justify-between mb-5">
                <h2 class="text-xl font-semibold text-slate-900">Gerenciar Categorias</h2>
                <button type="button"
                    class="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    @click="closeModal">
                    ×
                </button>
            </div>

            <div class="flex-1 overflow-y-auto">

                <div class="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200">
                    <h3 class="text-lg font-semibold text-slate-800 mb-4">Criar Nova Categoria</h3>
                    <form class="grid grid-cols-1 md:grid-cols-4 gap-3" @submit.prevent="saveCategory">
                        
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Nome</label>
                            <input v-model="form.name" type="text" placeholder="Ex: Passeio"
                                class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-300">
                        </div>

                
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Cor</label>
                            <div class="flex items-center gap-2">
                                <input v-model="form.color" type="color"
                                    class="w-full h-10 rounded-xl border border-slate-200 cursor-pointer">
                                <span class="text-sm text-slate-500">{{ form.color }}</span>
                            </div>
                        </div>

        
         
                        <div class="flex items-end">
                            <button type="submit"
                                class="w-full px-4 py-2.5 rounded-xl bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 transition-colors">
                                Criar
                            </button>
                        </div>
                    </form>
                    <p v-if="errorMessage" class="text-sm text-red-600 mt-2">{{ errorMessage }}</p>
                </div>


                <div>
                    <h3 class="text-lg font-semibold text-slate-800 mb-3">{{ categories.length }} {{ categories.length
                        === 1 ? 'Categoria' : 'Categorias' }}</h3>

                    <div v-if="categories.length === 0" class="text-center py-8 text-slate-400">
                        <p>Nenhuma categoria criada ainda.</p>
                    </div>

                    <div v-else class="space-y-2">
                        <div v-for="category in categories" :key="category._id"
                            class="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
              
                            <div class="flex items-center gap-3 flex-1">
                    
                                <div class="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0"
                                    :style="{ backgroundColor: category.color }" :title="category.color"></div>

                     
                                <div>
                                    <p class="font-semibold text-slate-800">{{ category.name }}</p>
                                    <p class="text-xs text-slate-400">Criada em {{ formatDate(category.createdAt) }}</p>
                                </div>
                            </div>

          
                            <button @click="openDeleteConfirm(category)"
                                class="ml-4 px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-medium text-sm shrink-0">
                                Deletar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <button type="button" @click="closeModal"
                    class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium">
                    Fechar
                </button>
            </div>
        </div>


        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm mx-4">
                <h3 class="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h3>
                <p class="text-sm text-slate-500 mb-6">
                    Deseja realmente deletar a categoria <strong>{{ categoryToDelete?.name }}</strong>?
                </p>
                <div class="flex justify-end gap-3">
                    <button @click="showDeleteConfirm = false"
                        class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm transition-colors">
                        Cancelar
                    </button>
                    <button @click="confirmDelete"
                        class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm transition-colors font-medium">
                        Deletar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useCategories } from "../services/useCategories";

const emit = defineEmits(["close"]);

// ── Usar o Composable ──
const { categories, createNewCategory, removeCategory } = useCategories();

// ── State do Modal ──
const form = ref({
    name: "",
    color: "#64748b",    // cor padrão
});

const errorMessage = ref("");
const showDeleteConfirm = ref(false);
const categoryToDelete = ref(null);

// ── Funções ──

async function saveCategory() {
    errorMessage.value = "";

    // Validação 1: Nome é obrigatório
    if (!form.value.name.trim()) {
        errorMessage.value = "Nome da categoria é obrigatório.";
        return;
    }

    // Validação 2: Nome não pode ser muito curto
    if (form.value.name.trim().length < 2) {
        errorMessage.value = "Nome deve ter pelo menos 2 caracteres.";
        return;
    }



    try {
        // Chama a função do composable para criar
        await createNewCategory(
            form.value.name.trim(),
            form.value.color
        );

        // se conseguir, limpa o form
        resetForm();
        errorMessage.value = "";
    } catch (error) {
        console.error("Erro ao criar categoria:", error);
        errorMessage.value = error?.response?.data?.message || "Erro ao criar categoria.";
    }
}

/**
 * Abrir modal de confirmação de deletar
 */
function openDeleteConfirm(category) {
    categoryToDelete.value = category;
    showDeleteConfirm.value = true;
}

/**
 * Confirmar exclusão da categoria
 */
async function confirmDelete() {
    if (!categoryToDelete.value) return;

    try {
        await removeCategory(categoryToDelete.value._id);
        showDeleteConfirm.value = false;
        categoryToDelete.value = null;
    } catch (error) {
        console.error("Erro ao deletar categoria:", error);
        errorMessage.value = "Erro ao deletar categoria.";
    }
}

/**
 * Resetar o form para o estado inicial
 */
function resetForm() {
    form.value = {
        name: "",
        color: "#64748b",
    };
}

/**
 * Formatar data para exibição
 * @param {string} isoDate - Data em formato ISO
 * @returns {string} - Data formatada
 */
function formatDate(isoDate) {
    if (!isoDate) return "Sem data";
    const d = new Date(isoDate);
    return d.toLocaleDateString("pt-BR");
}

//fecha
function closeModal() {
    emit("close");
}
</script>
