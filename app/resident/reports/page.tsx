"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ResidentHeader } from "@/components/resident-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Plus, Clock, AlertCircle, CheckCircle, MessageCircle } from "lucide-react"
import { ReportChatModal } from "@/components/report-chat-modal"
import { connectRealtimeEvents } from "@/lib/client/sse"

interface Report {
  id: string
  title: string
  description: string
  type: string
  location: string
  status: string
  created_at: string
  response?: string
  unreadByResident?: boolean
  unreadReplyCount?: number
}

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'other',
    location: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData()
      }
    }, 3000)

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        loadData()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  useEffect(() => {
    const cleanup = connectRealtimeEvents({
      onUpdate: (parsed) => {
        if (parsed?.type === "reports.updated") {
          loadData()
        }
      },
    })
    return cleanup
  }, [])

  const loadData = async () => {
    try {
      const [sessionRes, reportsRes] = await Promise.all([
        fetch('/api/me', { credentials: 'include' }),
        fetch('/api/reports', { credentials: 'include' })
      ])

      if (sessionRes.status === 401) {
        router.push('/login')
        return
      }

      const sessionData = await sessionRes.json()
      const reportsData = await reportsRes.json()

      if (sessionData.success) {
        setUser(sessionData.data)
      }

      if (reportsData.success) {
        setReports(reportsData.data || [])
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
      alert('You must complete KYC verification to submit reports')
      router.push('/kyc')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          reporterName: user.full_name || user.email,
          reporterContact: user.email
        })
      })

      const data = await res.json()

      if (data.success) {
        setIsDialogOpen(false)
        setFormData({ title: '', description: '', type: 'other', location: '' })
        loadData()
        alert('Report submitted successfully!')
      } else {
        alert(data.error || 'Failed to submit report')
      }
    } catch (error) {
      alert('Error submitting report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-orange-600" />
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
            <h1 className="text-3xl font-bold">My Reports</h1>
            <p className="text-muted-foreground">Track your submitted reports</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} disabled={!user?.is_verified}>
            <Plus className="h-4 w-4 mr-2" />
            Submit Report
          </Button>
        </div>

        {!user?.is_verified && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4">
              <p className="text-sm text-yellow-800">
                You must complete KYC verification to submit reports. 
                <Button variant="link" className="px-2" onClick={() => router.push('/kyc')}>
                  Verify now
                </Button>
              </p>
            </CardContent>
          </Card>
        )}

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No reports yet</p>
              {user?.is_verified && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  Submit your first report
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className={`relative ${report.unreadByResident ? "border-blue-300 bg-blue-50/30" : ""}`}>
                {report.unreadByResident && (
                  <div className="absolute -top-2 -left-2 z-10">
                    <Badge className="bg-blue-600 text-white flex items-center gap-1 shadow-sm">
                      <MessageCircle className="h-3 w-3" />
                      {report.unreadReplyCount && report.unreadReplyCount > 0 ? report.unreadReplyCount : 1}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(report.status)}
                        <CardTitle>{report.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{report.type}</Badge>
                        <Badge variant={
                          report.status === 'resolved' ? 'default' :
                          report.status === 'in-progress' ? 'secondary' : 'outline'
                        }>
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                  <p className="text-sm text-muted-foreground mb-4">Location: {report.location}</p>
                  
                  {report.response && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Admin Response:</p>
                      <p className="text-sm text-blue-800">{report.response}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Submitted: {new Date(report.created_at).toLocaleString()}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      setSelectedReport(report)
                      setChatModalOpen(true)
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Submit Report Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit a Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crime">Crime (Emergency)</SelectItem>
                  <SelectItem value="missing_person">Missing Person (Emergency)</SelectItem>
                  <SelectItem value="fire">Fire (Emergency)</SelectItem>
                  <SelectItem value="medical">Medical Emergency</SelectItem>
                  <SelectItem value="disaster">Natural Disaster</SelectItem>
                  <SelectItem value="assault">Assault</SelectItem>
                  <SelectItem value="robbery">Robbery</SelectItem>
                  <SelectItem value="hazard">Hazard</SelectItem>
                  <SelectItem value="waste">Waste Management</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="environment">Environmental Issues</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedReport && (
        <ReportChatModal
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
          report={{
            id: selectedReport.id,
            title: selectedReport.title,
            status: selectedReport.status,
            type: selectedReport.type,
            description: selectedReport.description,
            location: selectedReport.location,
            reporterName: user?.full_name || "",
            reporterContact: user?.email || "",
            createdAt: selectedReport.created_at,
          }}
          currentUserRole="resident"
        />
      )}
    </div>
  )
}
