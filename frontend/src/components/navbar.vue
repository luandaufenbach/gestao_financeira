<template>
  <nav class="bg-slate-900 text-white shadow-lg">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span class="text-slate-900 font-bold text-sm">G</span>
          </div>
          <RouterLink to="/dashboard" class="text-lg font-semibold tracking-tight hover:text-green-400 transition-colors">
            Gestão App
          </RouterLink>
        </div>
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          Online
        </div>
      </div>
    </div>
  </nav>
</template>

