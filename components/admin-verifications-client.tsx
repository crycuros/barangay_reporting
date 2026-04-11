"use client"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

type VerificationUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  kyc_status: string
  kyc_id_image: string | null
  kyc_notes: string | null
  kyc_submitted_at: string | null
  is_verified: boolean
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }
  if (email) return email[0].toUpperCase()
  return "?"
}

export function AdminVerificationsClient() {
  const router = useRouter()
  const [users, setUsers] = useState<VerificationUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/verifications", { credentials: "same-origin" })
      if (res.status === 401) {
        router.push("/admin-login")
        return
      }
      const data = await res.json()
      if (data?.data) setUsers(data.data)
    } catch {}
    setLoading(false)
  }

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    setActioning(userId)
    try {
      const res = await fetch(`/api/admin/verifications/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      }
    } catch {}
    setActioning(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />
      <main className="ml-64 p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resident Verifications</h1>
          <p className="text-muted-foreground mt-1">Review and approve KYC submissions from residents</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Pending Verifications
            </CardTitle>
            <CardDescription>Residents awaiting approval or not yet verified</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No pending verifications.</p>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Card key={user.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex items-center gap-4 shrink-0">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name || user.email} />
                            <AvatarFallback className="bg-primary/20 text-primary text-lg">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{user.full_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {user.is_verified ? (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-0.5" /> {user.kyc_status || "Not submitted"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {user.kyc_id_image && (
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Submitted ID</p>
                            <img
                              src={user.kyc_id_image}
                              alt="ID"
                              className="max-h-32 rounded-lg border object-contain bg-muted"
                            />
                            {user.kyc_submitted_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Submitted: {new Date(user.kyc_submitted_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 shrink-0 self-end lg:self-center">
                          <Button
                            size="sm"
                            variant="default"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleAction(user.id, "approve")}
                            disabled={actioning === user.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleAction(user.id, "reject")}
                            disabled={actioning === user.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
