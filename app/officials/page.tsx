"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail } from "lucide-react"
import type { Official } from "@/lib/types"
import { connectRealtimeEvents } from "@/lib/client/sse"

export default function OfficialsPage() {
  const [officials, setOfficials] = useState<Official[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOfficials()
  }, [])

  useEffect(() => {
    const cleanup = connectRealtimeEvents({
      onUpdate: (parsed) => {
        if (parsed?.type === "officials.updated" || parsed?.type === "users.updated") {
          fetchOfficials()
        }
      },
    })
    return cleanup
  }, [])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchOfficials()
      }
    }
    const interval = window.setInterval(refresh, 3000)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [])

  const fetchOfficials = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/officials")
      const data = await res.json()
      if (data?.data && Array.isArray(data.data)) {
        setOfficials(data.data)
      } else {
        setOfficials([])
      }
    } catch (error) {
      console.error("Failed to fetch officials:", error)
      setOfficials([])
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />

      <main className="ml-64 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Barangay Officials</h1>
            <p className="text-muted-foreground mt-1">Official accounts are automatically sourced from registered officials</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">Loading officials...</div>
          ) : officials.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">No official accounts found yet.</div>
          ) : (
            officials.map((official) => (
              <Card key={official.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{getInitials(official.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg">{official.name}</CardTitle>
                      <CardDescription>{official.position}</CardDescription>
                    </div>
                    <Badge
                      variant={(official as any).approvalStatus === "approved" && (official as any).isVerified ? "default" : "outline"}
                      className={(official as any).approvalStatus === "pending" ? "border-amber-300 text-amber-700" : ""}
                    >
                      {(official as any).approvalStatus === "approved" && (official as any).isVerified ? "Verified" : "Pending Verification"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm"><span className="font-medium">Department:</span> {official.department}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{official.email}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
