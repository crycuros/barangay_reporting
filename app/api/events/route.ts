import { NextRequest } from "next/server"
import { subscribeEvents } from "@/lib/server/realtime"

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send("connected", { ok: true, ts: Date.now() })

      const unsubscribe = subscribeEvents((evt) => {
        send("update", evt)
      })

      const keepAlive = setInterval(() => {
        send("ping", { ts: Date.now() })
      }, 25000)

      return () => {
        clearInterval(keepAlive)
        unsubscribe()
      }
    },
    cancel() {
      // handled by start cleanup
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

