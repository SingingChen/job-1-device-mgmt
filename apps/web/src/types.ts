// Shapes mirrored from the backend (see docs/backend-api-guide.md).

export type Role = 'ADMIN' | 'USER'
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface Device {
  id: string
  name: string
  serialNumber: string
  status: DeviceStatus
  category: string | null
  description: string | null
  lastSeenAt: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface DeviceInput {
  name: string
  serialNumber: string
  status?: DeviceStatus
  category?: string
  description?: string
}

export const DEVICE_STATUSES: DeviceStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE']

// Suggested device categories (分類). Stored as free-form strings on the backend.
export const DEVICE_CATEGORIES = ['感測器', '攝影機', '網路設備', '控制器', '其他']
