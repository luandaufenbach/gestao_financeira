import { ref, onMounted } from "vue";
import { getCategories, createCategory, deleteCategory } from "./api";

export function useCategories() {
    const categories = ref([]);    
    const loading = ref(false);    

    async function loadCategories() {
        try {
            loading.value = true;
            const data = await getCategories();
            categories.value = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Erro ao carregar categorias:", error);
            categories.value = [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * Criar uma nova categoria
     * @param {string} name - Nome da categoria (ex: "Passeio")
     * @param {string} color - Cor em hex (ex: "#FF5733")
     * @returns {Promise<Object>} A categoria criada
     */
    async function createNewCategory(name, color) {
        try {
            const newCategory = await createCategory(name, color);
            categories.value.push(newCategory);
            return newCategory;
        } catch (error) {
            console.error("Erro ao criar categoria:", error);
            throw error;
        }
    }

    /**
     * Deletar uma categoria pelo ID
     * @param {string} id - ID da categoria
     * @returns {Promise<void>}
     */
    async function removeCategory(id) {
        try {
            await deleteCategory(id);
            // Remove a categoria da lista sem precisar recarregar
            categories.value = categories.value.filter(cat => cat._id !== id);
        } catch (error) {
            console.error("Erro ao deletar categoria:", error);
            throw error;
        }
    }

    onMounted(() => {
        loadCategories();
    });

    return {
        categories,
        loading,
        loadCategories,
        createNewCategory,
        removeCategory,
    };
}
