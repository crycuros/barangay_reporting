"use client"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, ShieldCheck, User, MapPin, Phone, FileText, Image as ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"

type KYCData = {
  id: number
  full_name: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  address_line1: string | null
  barangay: string | null
  city: string | null
  province: string | null
  id_type: string | null
  id_number: string | null
  id_front_url: string | null
  id_back_url: string | null
  selfie_url: string | null
  notes: string | null
  submitted_at: string | null
  status: string | null
}

type VerificationUser = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_verified: boolean
  kyc: KYCData | null
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
  const [selectedUser, setSelectedUser] = useState<VerificationUser | null>(null)
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
        setSelectedUser(null)
      }
    } catch {}
    setActioning(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />
      <main className="ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Resident Verifications</h1>
          <p className="text-muted-foreground mt-1">Review and approve KYC submissions from residents</p>
        </div>

        <div className="flex gap-6">
          {/* Left Side - User List */}
          <div className="w-1/3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Pending ({users.length})
                </CardTitle>
                <CardDescription>Residents awaiting verification</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground py-8 text-center">Loading...</p>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No pending verifications.</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name || ""} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.full_name || "No name"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          {user.kyc ? (
                            <Badge variant="secondary" className="text-xs">Pending</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">No KYC</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Details & Documents */}
          <div className="flex-1">
            {selectedUser ? (
              <Card>
                <CardHeader>
                  <CardTitle>Verification Details</CardTitle>
                  <CardDescription>
                    {selectedUser.full_name || selectedUser.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left - Details */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <User className="h-4 w-4" /> Personal Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <DetailRow label="Full Name" value={selectedUser.kyc?.full_name || selectedUser.full_name || "-"} />
                          <DetailRow label="Email" value={selectedUser.email} />
                          <DetailRow label="Phone" value={selectedUser.kyc?.phone || "-"} />
                          <DetailRow label="Date of Birth" value={selectedUser.kyc?.date_of_birth ? new Date(selectedUser.kyc.date_of_birth).toLocaleDateString() : "-"} />
                          <DetailRow label="Gender" value={selectedUser.kyc?.gender || "-"} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Address
                        </h3>
                        <div className="space-y-2 text-sm">
                          <DetailRow label="Address" value={selectedUser.kyc?.address_line1 || "-"} />
                          <DetailRow label="Barangay" value={selectedUser.kyc?.barangay || "-"} />
                          <DetailRow label="City" value={selectedUser.kyc?.city || "-"} />
                          <DetailRow label="Province" value={selectedUser.kyc?.province || "-"} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" /> ID Details
                        </h3>
                        <div className="space-y-2 text-sm">
                          <DetailRow label="ID Type" value={selectedUser.kyc?.id_type?.replace('_', ' ').toUpperCase() || "-"} />
                          <DetailRow label="ID Number" value={selectedUser.kyc?.id_number || "-"} />
                        </div>
                      </div>
                    </div>

                    {/* Right - Documents */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Submitted Documents
                      </h3>
                      <div className="space-y-3">
                        <DocumentPreview label="ID Front" imageUrl={selectedUser.kyc?.id_front_url} />
                        <DocumentPreview label="ID Back" imageUrl={selectedUser.kyc?.id_back_url} />
                        <DocumentPreview label="Selfie" imageUrl={selectedUser.kyc?.selfie_url} />
                      </div>

                      {selectedUser.kyc?.submitted_at && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Submitted: {new Date(selectedUser.kyc.submitted_at).toLocaleString()}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          className="flex-1"
                          onClick={() => handleAction(selectedUser.id, "approve")}
                          disabled={actioning === selectedUser.id}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => handleAction(selectedUser.id, "reject")}
                          disabled={actioning === selectedUser.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Select a resident to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function DocumentPreview({ label, imageUrl }: { label: string; imageUrl: string | null }) {
  const [showLarge, setShowLarge] = useState(false)

  return (
    <>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          onClick={() => setShowLarge(true)}
          className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90"
        />
      ) : (
        <div className="w-full h-24 bg-muted rounded-lg border border-dashed flex items-center justify-center">
          <span className="text-muted-foreground text-xs">No image</span>
        </div>
      )}

      {showLarge && (
        <div
          onClick={() => setShowLarge(false)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <img src={imageUrl!} alt={label} className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  )
}