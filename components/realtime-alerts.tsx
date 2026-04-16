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
            const senderRole = String(evt?.payload?.senderRole || "")
            const preview = String(evt?.payload?.preview || "")
            // Only notify the opposite party
            const isSenderAdmin = senderRole === "admin" || senderRole === "official"
            const isSenderResident = !isSenderAdmin
            if (isSenderResident && (role === "admin" || role === "official")) {
              toast({ title: "New message from resident", description: preview || "A resident replied to a report." })
            } else if (isSenderAdmin && role === "resident") {
              toast({ title: "New reply on your report", description: preview || "An admin replied to your report." })
            }
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

        if (type === "announcements.updated") {
          const title = String(evt?.payload?.title || "")
          const content = String(evt?.payload?.content || "")
          const preview = content.length > 80 ? content.slice(0, 80).trimEnd() + "..." : content
          if (action === "created") {
            toast({
              title: `${title || "Bagong Announcement"}`,
              description: preview || undefined,
            })
          } else if (action === "updated" && (role === "admin" || role === "official")) {
            toast({
              title: `Updated: ${title || "Announcement"}`,
              description: preview || undefined,
            })
          } else if (action === "deleted" && (role === "admin" || role === "official")) {
            toast({
              title: `Deleted: ${title || "Announcement"}`,
            })
          }
          return
        }
      },
    })
    return cleanup
  }, [role])

  return null
}

