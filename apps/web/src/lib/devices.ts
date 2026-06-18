import { apiFetch } from './api'
import type { Device, DeviceInput, DeviceStatus } from '@/types'

export function listDevices(status?: DeviceStatus) {
  const query = status ? `?status=${status}` : ''
  return apiFetch<Device[]>(`/devices${query}`)
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
