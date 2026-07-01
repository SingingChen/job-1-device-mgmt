import { apiFetch } from './api'
import type {
  Device,
  DeviceInput,
  DevicePage,
  DeviceStats,
  DeviceStatus,
} from '@/types'

export function listDevices(
  filters: {
    status?: DeviceStatus
    category?: string
    search?: string
    page?: number
    pageSize?: number
  } = {},
) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  const query = params.toString()
  return apiFetch<DevicePage>(`/devices${query ? `?${query}` : ''}`)
}

export function getDeviceStats() {
  return apiFetch<DeviceStats>('/devices/stats')
}

export function createDevice(input: DeviceInput) {
  return apiFetch<Device>('/devices', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateDevice(id: string, input: Partial<DeviceInput>) {
  return apiFetch<Device>(`/devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteDevice(id: string) {
  return apiFetch<void>(`/devices/${id}`, { method: 'DELETE' })
}
