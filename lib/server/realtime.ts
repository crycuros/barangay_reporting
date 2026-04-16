type RealtimeEvent = {
  type: string
  payload?: Record<string, unknown>
  ts: number
}

type Listener = (event: RealtimeEvent) => void

// Use globalThis so all Next.js route modules share the same Set instance,
// even when modules are evaluated separately (avoids the split-instance problem).
const g = globalThis as typeof globalThis & { __realtimeListeners?: Set<Listener> }
if (!g.__realtimeListeners) {
  g.__realtimeListeners = new Set<Listener>()
}
const listeners = g.__realtimeListeners

export function publishEvent(type: string, payload?: Record<string, unknown>) {
  const event: RealtimeEvent = { type, payload, ts: Date.now() }
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // noop
    }
  }
}

export function subscribeEvents(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

