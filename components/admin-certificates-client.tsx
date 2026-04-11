"use client"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle, Clock, FileCheck, Scroll } from "lucide-react"

type CertRequest = {
  id: string
  userId: string
  type: string
  purpose: string
  status: string
  adminNotes: string | null
  createdAt: string
  processedAt: string | null
  fullName: string | null
  email: string
  avatarUrl: string | null
}

const typeLabels: Record<string, string> = {
  "barangay-clearance": "Barangay Clearance",
  "residency": "Certificate of Residency",
  "indigency": "Certificate of Indigency",
  "business-permit": "Business Permit",
  "cedula": "Cedula / CTC",
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  return email?.[0]?.toUpperCase() || "?"
}

function statusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="destructive">Pending</Badge>
    case "approved": return <Badge variant="default">Approved</Badge>
    case "ready": return <Badge variant="secondary">Ready for Pickup</Badge>
    case "rejected": return <Badge variant="outline">Rejected</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

export function AdminCertificatesClient() {
  const [requests, setRequests] = useState<CertRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/certificates", { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) setRequests(data.data)
    } catch {}
    setLoading(false)
  }

  const handleAction = async (id: string, action: "approve" | "reject" | "ready") => {
    setActioning(id)
    try {
      const res = await fetch(`/api/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      })
      if (res.ok) fetchRequests()
    } catch {}
    setActioning(null)
  }

  const filter = (status: string) => status === "all" ? requests : requests.filter(r => r.status === status)

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />
      <main className="ml-64 p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificate Requests</h1>
          <p className="text-muted-foreground mt-1">Process certificate and clearance requests from residents</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({filter("pending").length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({filter("approved").length})</TabsTrigger>
            <TabsTrigger value="ready">Ready ({filter("ready").length})</TabsTrigger>
            <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
          </TabsList>

          {["pending", "approved", "ready", "all"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filter(tab).length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Scroll className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No {tab === "all" ? "" : tab + " "}requests.</p>
                  </CardContent>
                </Card>
              ) : (
                filter(tab).map(req => (
                  <Card key={req.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={req.avatarUrl ?? undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {getInitials(req.fullName, req.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{req.fullName || "Resident"}</p>
                            <p className="text-xs text-muted-foreground">{req.email}</p>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">{typeLabels[req.type] || req.type}</span>
                            {statusBadge(req.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{req.purpose}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested: {new Date(req.createdAt).toLocaleString()}
                            {req.processedAt && ` · Processed: ${new Date(req.processedAt).toLocaleString()}`}
                          </p>
                          {req.adminNotes && (
                            <p className="text-xs bg-muted/50 rounded p-2 mt-2">Note: {req.adminNotes}</p>
                          )}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" onClick={() => handleAction(req.id, "approve")} disabled={actioning === req.id}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleAction(req.id, "reject")} disabled={actioning === req.id}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                        {req.status === "approved" && (
                          <Button size="sm" variant="secondary" onClick={() => handleAction(req.id, "ready")} disabled={actioning === req.id}>
                            <FileCheck className="h-4 w-4 mr-1" /> Mark Ready
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  )
}
