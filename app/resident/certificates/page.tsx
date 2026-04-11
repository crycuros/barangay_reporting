"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ResidentHeader } from "@/components/resident-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Scroll, Plus, Download, Clock, CheckCircle } from "lucide-react"

interface Certificate {
  id: string
  type: string
  purpose: string
  status: string
  requested_at: string
  issued_at?: string
}

export default function CertificatesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'barangay-clearance',
    purpose: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [sessionRes, certsRes] = await Promise.all([
        fetch('/api/me', { credentials: 'include' }),
        fetch('/api/certificates', { credentials: 'include' })
      ])

      if (sessionRes.status === 401) {
        router.push('/login')
        return
      }

      const sessionData = await sessionRes.json()
      const certsData = await certsRes.json()

      if (sessionData.success) {
        setUser(sessionData.data)
      }

      if (certsData.success) {
        setCertificates(certsData.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.is_verified) {
      alert('You must complete KYC verification to request certificates')
      router.push('/kyc')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        setIsDialogOpen(false)
        setFormData({ type: 'barangay-clearance', purpose: '' })
        loadData()
        alert('Certificate request submitted successfully!')
      } else {
        alert(data.error || 'Failed to request certificate')
      }
    } catch (error) {
      alert('Error requesting certificate')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ResidentHeader user={user} profile={{ role: user?.role || 'resident', full_name: user?.full_name || '' }} />
      
      <main className="container mx-auto px-4 py-6 max-w-5xl mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Certificates</h1>
            <p className="text-muted-foreground">Request and track your barangay certificates</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} disabled={!user?.is_verified}>
            <Plus className="h-4 w-4 mr-2" />
            Request Certificate
          </Button>
        </div>

        {!user?.is_verified && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4">
              <p className="text-sm text-yellow-800">
                You must complete KYC verification to request certificates. 
                <Button variant="link" className="px-2" onClick={() => router.push('/kyc')}>
                  Verify now
                </Button>
              </p>
            </CardContent>
          </Card>
        )}

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Scroll className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No certificate requests yet</p>
              {user?.is_verified && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  Request your first certificate
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <Card key={cert.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{cert.type.replace('-', ' ').toUpperCase()}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Purpose: {cert.purpose}</p>
                    </div>
                    {cert.status === 'issued' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={cert.status === 'issued' ? 'default' : 'secondary'}>
                      {cert.status}
                    </Badge>
                    {cert.status === 'issued' && (
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Requested: {new Date(cert.requested_at).toLocaleDateString()}
                  </p>
                  {cert.issued_at && (
                    <p className="text-xs text-muted-foreground">
                      Issued: {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Request Certificate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Certificate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Certificate Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barangay-clearance">Barangay Clearance</SelectItem>
                  <SelectItem value="certificate-of-residency">Certificate of Residency</SelectItem>
                  <SelectItem value="certificate-of-indigency">Certificate of Indigency</SelectItem>
                  <SelectItem value="business-permit">Business Permit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Input
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Employment, Business, Travel"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
