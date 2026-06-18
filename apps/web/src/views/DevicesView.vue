<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { ApiError } from '@/lib/api'
import {
  createDevice,
  deleteDevice,
  listDevices,
  updateDevice,
} from '@/lib/devices'
import { useAuthStore } from '@/stores/auth'
import { DEVICE_STATUSES, type Device, type DeviceInput, type DeviceStatus } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const devices = ref<Device[]>([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref<DeviceStatus | ''>('')

const STATUS_BADGE: Record<DeviceStatus, string> = {
  ONLINE: 'bg-green-100 text-green-700',
  OFFLINE: 'bg-slate-100 text-slate-600',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
}

// Surface auth failures by sending the user back to login.
function handleError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    auth.logout()
    router.push({ name: 'login' })
    return
  }
  error.value = (e as Error).message
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    devices.value = await listDevices(statusFilter.value || undefined)
  } catch (e) {
    handleError(e)
  } finally {
    loading.value = false
  }
}

// ---- Create -------------------------------------------------------------
const createForm = reactive<DeviceInput>({
  name: '',
  serialNumber: '',
  status: 'OFFLINE',
  description: '',
})
const creating = ref(false)

async function submitCreate() {
  creating.value = true
  error.value = ''
  try {
    await createDevice({
      name: createForm.name,
      serialNumber: createForm.serialNumber,
      status: createForm.status,
      description: createForm.description || undefined,
    })
    createForm.name = ''
    createForm.serialNumber = ''
    createForm.status = 'OFFLINE'
    createForm.description = ''
    await load()
  } catch (e) {
    handleError(e)
  } finally {
    creating.value = false
  }
}

// ---- Edit ---------------------------------------------------------------
const editing = ref<Device | null>(null)
const editForm = reactive<DeviceInput>({ name: '', serialNumber: '', status: 'OFFLINE', description: '' })
const savingEdit = ref(false)

function openEdit(device: Device) {
  editing.value = device
  editForm.name = device.name
  editForm.serialNumber = device.serialNumber
  editForm.status = device.status
  editForm.description = device.description ?? ''
}

async function submitEdit() {
  if (!editing.value) return
  savingEdit.value = true
  error.value = ''
  try {
    await updateDevice(editing.value.id, {
      name: editForm.name,
      serialNumber: editForm.serialNumber,
      status: editForm.status,
      description: editForm.description || undefined,
    })
    editing.value = null
    await load()
  } catch (e) {
    handleError(e)
  } finally {
    savingEdit.value = false
  }
}

// ---- Delete -------------------------------------------------------------
async function remove(device: Device) {
  if (!confirm(`確定刪除裝置「${device.name}」?`)) return
  error.value = ''
  try {
    await deleteDevice(device.id)
    await load()
  } catch (e) {
    handleError(e)
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppHeader />

    <main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <!-- Create -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-slate-700">新增裝置</h2>
        <form class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" @submit.prevent="submitCreate">
          <input
            v-model="createForm.name"
            required
            placeholder="名稱"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <input
            v-model="createForm.serialNumber"
            required
            placeholder="序號"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <select
            v-model="createForm.status"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option v-for="s in DEVICE_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <input
            v-model="createForm.description"
            placeholder="描述(選填)"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            :disabled="creating"
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ creating ? '新增中…' : '新增' }}
          </button>
        </form>
      </section>

      <!-- Filter + list -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 class="text-sm font-semibold text-slate-700">裝置列表</h2>
          <select
            v-model="statusFilter"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            @change="load"
          >
            <option value="">全部狀態</option>
            <option v-for="s in DEVICE_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <p v-if="error" class="px-4 py-3 text-sm text-red-600">{{ error }}</p>
        <p v-if="loading" class="px-4 py-6 text-center text-sm text-slate-400">載入中…</p>
        <p v-else-if="!devices.length" class="px-4 py-6 text-center text-sm text-slate-400">
          目前沒有裝置
        </p>

        <table v-else class="w-full text-sm">
          <thead class="text-left text-xs uppercase text-slate-400">
            <tr>
              <th class="px-4 py-2 font-medium">名稱</th>
              <th class="px-4 py-2 font-medium">序號</th>
              <th class="px-4 py-2 font-medium">狀態</th>
              <th class="px-4 py-2 font-medium">描述</th>
              <th class="px-4 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="d in devices" :key="d.id">
              <td class="px-4 py-2 font-medium text-slate-800">{{ d.name }}</td>
              <td class="px-4 py-2 font-mono text-xs text-slate-500">{{ d.serialNumber }}</td>
              <td class="px-4 py-2">
                <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[d.status]]">
                  {{ d.status }}
                </span>
              </td>
              <td class="px-4 py-2 text-slate-500">{{ d.description || '—' }}</td>
              <td class="px-4 py-2 text-right">
                <button class="text-indigo-600 hover:underline" @click="openEdit(d)">編輯</button>
                <button class="ml-3 text-red-600 hover:underline" @click="remove(d)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <!-- Edit modal -->
    <div
      v-if="editing"
      class="fixed inset-0 flex items-center justify-center bg-black/30 px-4"
      @click.self="editing = null"
    >
      <form
        class="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-lg"
        @submit.prevent="submitEdit"
      >
        <h2 class="text-lg font-semibold text-slate-800">編輯裝置</h2>

        <div class="space-y-1">
          <label class="text-sm text-slate-600">名稱</label>
          <input v-model="editForm.name" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div class="space-y-1">
          <label class="text-sm text-slate-600">序號</label>
          <input v-model="editForm.serialNumber" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div class="space-y-1">
          <label class="text-sm text-slate-600">狀態</label>
          <select v-model="editForm.status" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
            <option v-for="s in DEVICE_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-sm text-slate-600">描述</label>
          <input v-model="editForm.description" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100" @click="editing = null">
            取消
          </button>
          <button type="submit" :disabled="savingEdit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {{ savingEdit ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
