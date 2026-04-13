"use client"

import { useEffect, useRef, useState } from "react"
import { connectRealtimeEvents } from "@/lib/client/sse"
import { toast } from "@/hooks/use-toast"

type SessionUser = {
  role?: string
}

export function RealtimeAlerts() {
  const [role, setRole] = useState<string>("")
  const lastToastRef = useRef<{ key: string; at: number } | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" })
        const json = await res.json()
        const user = (json?.data || {}) as SessionUser
        setRole(String(user.role || ""))
      } catch {
        setRole("")
      }
    }
    loadSession()
  }, [])

  useEffect(() => {
    const cleanup = connectRealtimeEvents({
      onUpdate: (evt) => {
        const type = String(evt?.type || "")
        const action = String(evt?.payload?.action || "")
        const id = String(evt?.payload?.id || "")
        const key = `${type}:${action}:${id}`
        const now = Date.now()
        if (lastToastRef.current && lastToastRef.current.key === key && now - lastToastRef.current.at < 1500) {
          return
        }
        lastToastRef.current = { key, at: now }

        if (type === "reports.updated") {
          if (action === "created" && (role === "admin" || role === "official")) {
            toast({ title: "New report received", description: "A resident submitted a new report." })
          } else if (action === "message_sent") {
            toast({ title: "New report message", description: "A new message was posted in report chat." })
          }
          return
        }

        if (type === "certificates.updated") {
          if (action === "created" && (role === "admin" || role === "official")) {
            toast({ title: "New certificate request", description: "A resident requested a certificate." })
          } else {
            toast({ title: "Certificate updated", description: "Certificate status was updated." })
          }
          return
        }

        if (type === "announcements.updated" && role === "resident") {
          toast({ title: "New announcement update", description: "Barangay announcements were updated." })
          return
        }
      },
    })
    return cleanup
  }, [role])

  return null
}

