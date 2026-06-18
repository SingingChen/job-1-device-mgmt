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
  description?: string
}

export const DEVICE_STATUSES: DeviceStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE']
