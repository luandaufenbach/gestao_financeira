<template>
    <div class="bg-white rounded-xl shadow p-4">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-500">
                {{ title }}
            </h3>

            <span>
                {{ icon }}
            </span>
        </div>
        <div class="text-2xl font-bold">
            <slot />
        </div>
    </div>
</template>

<script setup>
defineProps({
    title: String,
    icon: String
})
</script>