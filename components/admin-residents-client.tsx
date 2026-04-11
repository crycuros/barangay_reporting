"use client"

import { useEffect, useState, useCallback } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Search, Users, Mail, Phone, MapPin } from "lucide-react"

type Resident = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_verified: boolean
  kyc_status: string
  phone: string | null
  address: string | null
  zone: string | null
  date_of_birth: string | null
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  return email?.[0]?.toUpperCase() || "?"
}

export function AdminResidentsClient() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState("all")

  const fetchResidents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (verifiedFilter !== "all") params.set("verified", verifiedFilter)
      const res = await fetch(`/api/admin/residents?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) setResidents(data.data)
    } catch {}
    setLoading(false)
  }, [search, verifiedFilter])

  useEffect(() => {
    const timer = setTimeout(fetchResidents, 300)
    return () => clearTimeout(timer)
  }, [fetchResidents])

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />
      <main className="ml-64 p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resident Directory</h1>
          <p className="text-muted-foreground mt-1">View and manage all registered residents</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Residents</SelectItem>
                  <SelectItem value="1">Verified</SelectItem>
                  <SelectItem value="0">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : residents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No residents found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{residents.length} resident(s)</p>
                {residents.map((r) => (
                  <div key={r.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/30 transition-colors">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(r.full_name, r.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{r.full_name || "No name"}</p>
                        {r.is_verified ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Unverified</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {r.email}</span>
                        {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</span>}
                        {r.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.address}</span>}
                        {r.zone && <span>Zone {r.zone}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
