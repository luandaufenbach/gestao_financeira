<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {{ title }}
      </span>
      <span v-if="icon" class="text-xl">{{ icon }}</span>
    </div>
    <div class="text-2xl font-bold text-slate-900">
      <slot />
    </div>
    <slot name="footer" />
  </div>
</template>

<script setup>
defineProps({
  title: String,
  icon: String,
});
</script>
