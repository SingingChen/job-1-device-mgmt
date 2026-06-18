// Minimal fetch wrapper around the backend API. The base URL comes from
// VITE_API_BASE_URL (see .env). Auth-token injection will be added alongside
// the login flow in a later iteration.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ?? `Request failed: ${res.status}`)
  }

  // 204 No Content has no body to parse.
  return (res.status === 204 ? undefined : await res.json()) as T
}
