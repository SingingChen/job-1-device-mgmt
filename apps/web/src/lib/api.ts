// Fetch wrapper around the backend API. Base URL comes from VITE_API_BASE_URL
// (see .env). The JWT (if present) is read from localStorage and sent as a
// Bearer token, so authenticated calls work transparently.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const TOKEN_KEY = 'token'

/** Thrown for non-2xx responses; `status` lets callers special-case 401 etc. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] }
    const message = Array.isArray(body.message)
      ? body.message.join('、')
      : (body.message ?? `請求失敗 (HTTP ${res.status})`)
    throw new ApiError(res.status, message)
  }

  // 204 No Content has no body to parse.
  return (res.status === 204 ? undefined : await res.json()) as T
}
