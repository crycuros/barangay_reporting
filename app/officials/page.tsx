"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Mail, Phone, Trash2, Upload } from "lucide-react"
import type { Official } from "@/lib/types"

export default function OfficialsPage() {
  const [officials, setOfficials] = useState<Official[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    contact: "",
    email: "",
    department: "",
  })

  useEffect(() => {
    fetchOfficials()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch("/api/officials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      setIsDialogOpen(false)
      setFormData({ name: "", position: "", contact: "", email: "", department: "" })
      fetchOfficials()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this official?")) return

    const res = await fetch(`/api/officials/${id}`, { method: "DELETE" })
    if (res.ok) fetchOfficials()
  }

  const handlePhotoChange = async (id: string, file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const imageBase64 = reader.result as string
      const res = await fetch(`/api/officials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      })
      if (res.ok) fetchOfficials()
    }
    reader.readAsDataURL(file)
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
            <p className="text-muted-foreground mt-1">Manage the directory of barangay officials</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Official
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Official</DialogTitle>
                  <DialogDescription>Add a new barangay official to the directory</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input id="position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Number</Label>
                    <Input id="contact" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Official</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">Loading officials...</div>
          ) : officials.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">No officials found. Add one to get started.</div>
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(official.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm"><span className="font-medium">Department:</span> {official.department}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{official.contact}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{official.email}</div>

                  <div className="space-y-2">
                    <Label htmlFor={`photo-${official.id}`}>Photo</Label>
                    <input id={`photo-${official.id}`} type="file" accept="image/*" onChange={(e) => handlePhotoChange(official.id, e.target.files?.[0] || null)} />
                    <div className="text-xs text-muted-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Upload/replace photo</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
