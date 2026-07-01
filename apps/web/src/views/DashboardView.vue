<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { ApiError } from '@/lib/api'
import { getDeviceStats } from '@/lib/devices'
import { useDeviceStream } from '@/lib/useDeviceStream'
import { useAuthStore } from '@/stores/auth'
import type { DeviceStats, DeviceStatus } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const stats = ref<DeviceStats | null>(null)
const loading = ref(false)
const error = ref('')

const total = computed(() => stats.value?.total ?? 0)
const counts = computed<Record<DeviceStatus, number>>(
  () => stats.value?.byStatus ?? { ONLINE: 0, OFFLINE: 0, MAINTENANCE: 0 },
)
const recent = computed(() => stats.value?.recent ?? [])
// Server already returns categories sorted by count desc.
const categoryCounts = computed(() =>
  (stats.value?.byCategory ?? []).map((c) => [c.category, c.count] as const),
)

const STATUS_META: Record<DeviceStatus, { label: string; card: string; badge: string }> = {
  ONLINE: { label: '線上', card: 'border-green-500/30 bg-green-500/10', badge: 'bg-green-500/15 text-green-300' },
  OFFLINE: { label: '離線', card: 'border-slate-700 bg-slate-800/60', badge: 'bg-slate-700 text-slate-300' },
  MAINTENANCE: { label: '維護中', card: 'border-amber-500/30 bg-amber-500/10', badge: 'bg-amber-500/15 text-amber-300' },
}
const STATUS_ORDER: DeviceStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE']

async function load(silent = false) {
  if (!silent) loading.value = true
  error.value = ''
  try {
    stats.value = await getDeviceStats()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      auth.logout()
      router.push({ name: 'login' })
      return
    }
    error.value = (e as Error).message
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => load())
// Live updates: refetch (silently) whenever the server pushes a device change.
useDeviceStream(() => load(true))
</script>

<template>
  <div class="min-h-screen bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-100">Dashboard</h2>
        <RouterLink
          to="/devices"
          class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          管理裝置 →
        </RouterLink>
      </div>

      <p v-if="error" class="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error }}</p>
      <p v-if="loading" class="text-sm text-slate-500">載入中…</p>

      <template v-else>
        <!-- Summary cards -->
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
            <p class="text-sm text-slate-400">裝置總數</p>
            <p class="mt-1 text-3xl font-bold text-slate-100">{{ total }}</p>
          </div>
          <div
            v-for="s in STATUS_ORDER"
            :key="s"
            :class="['rounded-xl border p-4 shadow-sm', STATUS_META[s].card]"
          >
            <p class="text-sm text-slate-400">{{ STATUS_META[s].label }}</p>
            <p class="mt-1 text-3xl font-bold text-slate-100">{{ counts[s] }}</p>
          </div>
        </section>

        <!-- Category breakdown -->
        <section class="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <h3 class="mb-3 text-sm font-semibold text-slate-200">依類別</h3>
          <p v-if="!categoryCounts.length" class="text-sm text-slate-500">尚無資料</p>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="[cat, n] in categoryCounts"
              :key="cat"
              class="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm"
            >
              <span class="text-slate-200">{{ cat }}</span>
              <span class="rounded-full bg-indigo-500/20 px-2 text-xs font-medium text-indigo-300">{{ n }}</span>
            </span>
          </div>
        </section>

        <!-- Recent devices -->
        <section class="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div class="border-b border-slate-800 px-4 py-3">
            <h3 class="text-sm font-semibold text-slate-200">最近新增的裝置</h3>
          </div>

          <p v-if="!recent.length" class="px-4 py-6 text-center text-sm text-slate-500">
            目前沒有裝置,
            <RouterLink to="/devices" class="text-indigo-400 hover:underline">前往新增</RouterLink>
          </p>

          <table v-else class="w-full text-sm">
            <thead class="text-left text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-2 font-medium">名稱</th>
                <th class="px-4 py-2 font-medium">序號</th>
                <th class="px-4 py-2 font-medium">狀態</th>
                <th class="px-4 py-2 font-medium">建立時間</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="d in recent" :key="d.id">
                <td class="px-4 py-2 font-medium text-slate-100">{{ d.name }}</td>
                <td class="px-4 py-2 font-mono text-xs text-slate-400">{{ d.serialNumber }}</td>
                <td class="px-4 py-2">
                  <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', STATUS_META[d.status].badge]">
                    {{ STATUS_META[d.status].label }}
                  </span>
                </td>
                <td class="px-4 py-2 text-slate-400">{{ new Date(d.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </main>
  </div>
</template>
