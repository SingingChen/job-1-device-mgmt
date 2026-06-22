<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="border-b border-slate-800 bg-slate-900">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div class="flex items-center gap-6">
        <h1 class="text-lg font-semibold text-slate-100">Device Management</h1>
        <nav class="flex items-center gap-4 text-sm">
          <RouterLink to="/dashboard" class="text-slate-400 hover:text-slate-100" active-class="font-medium text-indigo-400">
            Dashboard
          </RouterLink>
          <RouterLink to="/devices" class="text-slate-400 hover:text-slate-100" active-class="font-medium text-indigo-400">
            裝置
          </RouterLink>
        </nav>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-slate-400">{{ auth.user?.email }}</span>
        <button
          class="rounded-md border border-slate-700 px-3 py-1 text-slate-300 transition hover:bg-slate-800"
          @click="logout"
        >
          登出
        </button>
      </div>
    </div>
  </header>
</template>
