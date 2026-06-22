<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(email.value, password.value, name.value)
    router.push({ name: 'devices' })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-950 px-4">
    <form
      class="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
      @submit.prevent="submit"
    >
      <h1 class="text-xl font-semibold text-slate-100">註冊</h1>

      <div class="space-y-1">
        <label class="text-sm text-slate-300">名稱</label>
        <input
          v-model="name"
          type="text"
          required
          class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm text-slate-300">Email</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm text-slate-300">密碼(至少 8 碼)</label>
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ loading ? '註冊中…' : '註冊' }}
      </button>

      <p class="text-center text-sm text-slate-400">
        已經有帳號?
        <RouterLink to="/login" class="text-indigo-400 hover:underline">登入</RouterLink>
      </p>
    </form>
  </main>
</template>
