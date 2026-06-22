import { apiFetch } from './api'
import type { Device, DeviceInput, DeviceStatus } from '@/types'

export function listDevices(filters: { status?: DeviceStatus; category?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)
  const query = params.toString()
  return apiFetch<Device[]>(`/devices${query ? `?${query}` : ''}`)
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
