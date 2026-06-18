import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch, TOKEN_KEY } from '@/lib/api'
import type { AuthResponse, User } from '@/types'

const USER_KEY = 'user'

function loadUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as User) : null
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(loadUser())
  const isAuthenticated = computed(() => !!token.value)

  function setSession(res: AuthResponse) {
    token.value = res.accessToken
    user.value = res.user
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }

  async function login(email: string, password: string) {
    setSession(
      await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    )
  }

  async function register(email: string, password: string, name: string) {
    setSession(
      await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    )
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isAuthenticated, login, register, logout }
})
