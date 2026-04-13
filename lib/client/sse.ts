type RealtimeHandler = (payload: any) => void

type ConnectOptions = {
  onUpdate: RealtimeHandler
}

export function connectRealtimeEvents({ onUpdate }: ConnectOptions) {
  let es: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let attempts = 0
  let stopped = false

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const cleanupSource = () => {
    if (es) {
      es.close()
      es = null
    }
  }

  const scheduleReconnect = () => {
    if (stopped) return
    clearReconnect()
    const delay = Math.min(1000 * 2 ** attempts, 15000)
    attempts += 1
    reconnectTimer = setTimeout(connect, delay)
  }

  const connect = () => {
    if (stopped) return
    cleanupSource()
    es = new EventSource("/api/events")

    es.addEventListener("connected", () => {
      attempts = 0
    })

    es.addEventListener("update", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data)
        onUpdate(parsed)
      } catch {
        // noop
      }
    })

    es.onerror = () => {
      cleanupSource()
      scheduleReconnect()
    }
  }

  connect()

  return () => {
    stopped = true
    clearReconnect()
    cleanupSource()
  }
}

