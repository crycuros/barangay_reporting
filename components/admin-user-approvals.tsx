"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PendingUser {
  id: string
  email: string
  full_name: string | null
  role: string
  approval_status: string
  is_verified: boolean
  phone: string | null
  address: string | null
  zone: string | null
  created_at: string
}

export function AdminUserApprovals() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [canApprove, setCanApprove] = useState(false)

  const fetchPendingUsers = async () => {
    try {
      const meRes = await fetch("/api/me", { credentials: "same-origin" })
      const meData = await meRes.json()
      const isSuperAdmin = meData?.data?.role === "super_admin"
      setCanApprove(isSuperAdmin)

      const res = await fetch("/api/admin/users", {
        credentials: "same-origin",
      })
      const data = await res.json()
      if (data.success) {
        const pending = data.data.filter(
          (u: PendingUser) => u.role === "official" && (u.approval_status === "pending" || !u.is_verified)
        )
        setPendingUsers(pending)
      }
    } catch (e) {
      console.error("Failed to fetch pending users:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingUsers()
    const refresh = () => { fetchPendingUsers() }
    window.addEventListener("admin-users:updated", refresh)
    return () => window.removeEventListener("admin-users:updated", refresh)
  }, [])

  const handleApproval = async (userId: string, action: "approve" | "reject") => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
      } else {
        alert(data.error || "Failed to update user")
      }
    } catch (e) {
      console.error("Failed to approve/reject user:", e)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Official Approvals</CardTitle>
          <CardDescription>Newly registered officials awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No pending approvals
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Official Approvals</CardTitle>
        <CardDescription>Newly registered officials awaiting approval</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="space-y-1">
                <p className="font-medium">{user.full_name || "No name"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {user.phone && <span>📞 {user.phone}</span>}
                  {user.zone && <span>📍 {user.zone}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApproval(user.id, "approve")}
                  disabled={actionLoading === user.id || !canApprove}
                >
                  {actionLoading === user.id ? "..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApproval(user.id, "reject")}
                  disabled={actionLoading === user.id || !canApprove}
                >
                  {actionLoading === user.id ? "..." : "Reject"}
                </Button>
              </div>
            </div>
          ))}
          {!canApprove && (
            <p className="text-xs text-muted-foreground">Only Super Admin can approve or reject official registrations.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}