type RealtimeEvent = {
  type: string
  payload?: Record<string, unknown>
  ts: number
}

type Listener = (event: RealtimeEvent) => void

const listeners = new Set<Listener>()

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

