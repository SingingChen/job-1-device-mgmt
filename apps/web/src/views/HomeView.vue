<script setup lang="ts">
import { ref } from 'vue'

const apiBase = import.meta.env.VITE_API_BASE_URL
const status = ref('')
const loading = ref(false)

// Pings the backend's GET / (plain-text greeting) to confirm connectivity.
async function checkApi() {
  loading.value = true
  status.value = ''
  try {
    const res = await fetch(`${apiBase}/`)
    status.value = res.ok ? `連線正常 (HTTP ${res.status})` : `回應錯誤 (HTTP ${res.status})`
  } catch (e) {
    status.value = `連線失敗:${(e as Error).message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-slate-800">
    <h1 class="text-3xl font-bold">Device Management</h1>
    <p class="text-slate-500">前端 scaffold 已就緒 · Vue 3 + Vite + TypeScript + Tailwind</p>

    <button
      class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
      :disabled="loading"
      @click="checkApi"
    >
      {{ loading ? '檢查中…' : '測試後端連線' }}
    </button>

    <p v-if="status" class="font-mono text-sm">{{ status }}</p>
    <p class="text-xs text-slate-400">API: {{ apiBase }}</p>
  </main>
</template>
