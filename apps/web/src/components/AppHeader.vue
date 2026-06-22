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
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div class="flex items-center gap-6">
        <h1 class="text-lg font-semibold text-slate-800">Device Management</h1>
        <nav class="flex items-center gap-4 text-sm">
          <RouterLink to="/dashboard" class="text-slate-500 hover:text-slate-800" active-class="font-medium text-indigo-600">
            Dashboard
          </RouterLink>
          <RouterLink to="/devices" class="text-slate-500 hover:text-slate-800" active-class="font-medium text-indigo-600">
            裝置
          </RouterLink>
        </nav>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-slate-500">{{ auth.user?.email }}</span>
        <button
          class="rounded-md border border-slate-300 px-3 py-1 text-slate-600 transition hover:bg-slate-100"
          @click="logout"
        >
          登出
        </button>
      </div>
    </div>
  </header>
</template>
