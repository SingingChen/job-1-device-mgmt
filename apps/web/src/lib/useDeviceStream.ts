import { onMounted, onUnmounted } from 'vue'
import { TOKEN_KEY } from './api'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Subscribe to the backend's device-change SSE stream and call `onChange` on
 * each event. The JWT is passed as a query param because EventSource cannot set
 * an Authorization header. EventSource auto-reconnects on transient drops.
 */
export function useDeviceStream(onChange: () => void) {
  let es: EventSource | undefined

  onMounted(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    es = new EventSource(`${BASE}/devices/events?token=${encodeURIComponent(token)}`)
    es.onmessage = () => onChange()
  })

  onUnmounted(() => es?.close())
}
