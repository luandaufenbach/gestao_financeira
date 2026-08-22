<template>
  <!--
    max-w-full + overflow-x-auto: em telas estreitas as três abas passam da
    largura disponível. Sem isso elas empurravam a página inteira, criando
    rolagem horizontal no documento todo em vez de só nas abas.
  -->
  <nav
    class="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 sm:p-1.5 border border-slate-200"
  >
    <RouterLink
      v-for="tab in TABS"
      :key="tab.to"
      :to="tab.to"
      class="shrink-0 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      :class="
        route.path === tab.to
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      "
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>

<script setup>
/**
 * Navegação por abas.
 *
 * MOTIVO: o mesmo bloco de três RouterLink estava repetido nas três views,
 * com a aba ativa marcada à mão em cada uma. Qualquer aba nova exigia editar
 * três arquivos, e era fácil esquecer de trocar a marcação de ativo.
 * Aqui a aba ativa é derivada da rota atual.
 */
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();

const TABS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transações" },
  { to: "/goals", label: "Metas" },
];
</script>
