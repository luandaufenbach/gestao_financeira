<template>
  <nav class="bg-slate-900 text-white shadow-lg">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span class="text-slate-900 font-bold text-sm">G</span>
          </div>
          <RouterLink
            to="/dashboard"
            class="text-lg font-semibold tracking-tight hover:text-green-400 transition-colors"
          >
            Gestão App
          </RouterLink>
        </div>

        <div class="flex items-center gap-4">
          <span v-if="user" class="text-sm text-slate-300 hidden sm:inline">{{ user.name }}</span>
          <button
            type="button"
            class="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
            @click="handleLogout"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink, useRouter } from "vue-router";
import { useAuth } from "../stores/auth";
import { useCategories } from "../stores/categories";

const router = useRouter();
const { user, logout } = useAuth();
const { reset: resetCategories } = useCategories();

function handleLogout() {
  logout();
  // Limpa o cache de categorias para não vazar dados de uma conta para outra
  // quando alguém troca de usuário na mesma aba.
  resetCategories();
  router.replace("/login");
}
</script>
