import { NextRequest } from "next/server"
import { subscribeEvents } from "@/lib/server/realtime"

// Prevent Next.js from statically caching this streaming route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false
  let unsubscribe: (() => void) | null = null
  let keepAlive: ReturnType<typeof setInterval> | null = null
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null

  const closeStream = () => {
    if (closed) return
    closed = true
    if (keepAlive) {
      clearInterval(keepAlive)
      keepAlive = null
    }
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    try {
      controllerRef?.close()
    } catch {
      // no-op (already closed)
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller

      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closeStream()
        }
      }

      send("connected", { ok: true, ts: Date.now() })

      unsubscribe = subscribeEvents((evt) => {
        send("update", evt)
      })

      keepAlive = setInterval(() => {
        send("ping", { ts: Date.now() })
      }, 25000)
    },
    cancel() {
      closeStream()
    },
  })

  request.signal.addEventListener("abort", () => {
    closeStream()
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

