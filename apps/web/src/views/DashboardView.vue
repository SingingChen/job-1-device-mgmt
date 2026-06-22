<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { ApiError } from '@/lib/api'
import { listDevices } from '@/lib/devices'
import { useAuthStore } from '@/stores/auth'
import type { Device, DeviceStatus } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const devices = ref<Device[]>([])
const loading = ref(false)
const error = ref('')

const total = computed(() => devices.value.length)
const counts = computed(() => {
  const c: Record<DeviceStatus, number> = { ONLINE: 0, OFFLINE: 0, MAINTENANCE: 0 }
  for (const d of devices.value) c[d.status]++
  return c
})
// listDevices() returns newest first (createdAt desc), so the head is "recent".
const recent = computed(() => devices.value.slice(0, 5))

const STATUS_META: Record<DeviceStatus, { label: string; card: string; badge: string }> = {
  ONLINE: { label: '線上', card: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-700' },
  OFFLINE: { label: '離線', card: 'border-slate-200 bg-slate-50', badge: 'bg-slate-100 text-slate-600' },
  MAINTENANCE: { label: '維護中', card: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
}
const STATUS_ORDER: DeviceStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE']

async function load() {
  loading.value = true
  error.value = ''
  try {
    devices.value = await listDevices()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      auth.logout()
      router.push({ name: 'login' })
      return
    }
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppHeader />

    <main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-800">Dashboard</h2>
        <RouterLink
          to="/devices"
          class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          管理裝置 →
        </RouterLink>
      </div>

      <p v-if="error" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>
      <p v-if="loading" class="text-sm text-slate-400">載入中…</p>

      <template v-else>
        <!-- Summary cards -->
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-sm text-slate-500">裝置總數</p>
            <p class="mt-1 text-3xl font-bold text-slate-800">{{ total }}</p>
          </div>
          <div
            v-for="s in STATUS_ORDER"
            :key="s"
            :class="['rounded-xl border p-4 shadow-sm', STATUS_META[s].card]"
          >
            <p class="text-sm text-slate-500">{{ STATUS_META[s].label }}</p>
            <p class="mt-1 text-3xl font-bold text-slate-800">{{ counts[s] }}</p>
          </div>
        </section>

        <!-- Recent devices -->
        <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-4 py-3">
            <h3 class="text-sm font-semibold text-slate-700">最近新增的裝置</h3>
          </div>

          <p v-if="!recent.length" class="px-4 py-6 text-center text-sm text-slate-400">
            目前沒有裝置,
            <RouterLink to="/devices" class="text-indigo-600 hover:underline">前往新增</RouterLink>
          </p>

          <table v-else class="w-full text-sm">
            <thead class="text-left text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-2 font-medium">名稱</th>
                <th class="px-4 py-2 font-medium">序號</th>
                <th class="px-4 py-2 font-medium">狀態</th>
                <th class="px-4 py-2 font-medium">建立時間</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="d in recent" :key="d.id">
                <td class="px-4 py-2 font-medium text-slate-800">{{ d.name }}</td>
                <td class="px-4 py-2 font-mono text-xs text-slate-500">{{ d.serialNumber }}</td>
                <td class="px-4 py-2">
                  <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', STATUS_META[d.status].badge]">
                    {{ STATUS_META[d.status].label }}
                  </span>
                </td>
                <td class="px-4 py-2 text-slate-500">{{ new Date(d.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </main>
  </div>
</template>
