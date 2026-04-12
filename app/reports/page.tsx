"use client"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Report, ReportStatus } from "@/lib/types"
import { MapPin, Phone, Upload, User, MessageCircle, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { cn } from "@/lib/utils"
import { ReportChatModal } from "@/components/report-chat-modal"

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState<ReportStatus>("pending")
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isOfficial, setIsOfficial] = useState(false)
  const { role } = useAuth()
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [chatReport, setChatReport] = useState<Report | null>(null)

  useEffect(() => {
    setIsOfficial(role === "official" || role === "admin")
    fetchReports()
  }, [role])

  const parseJsonSafe = async (res: Response) => {
    const ct = res.headers.get("content-type") || ""
    if (!ct.includes("application/json")) return null
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  // role comes from AuthProvider

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports", { credentials: "same-origin" })
      if (res.status === 401) {
        router.push("/admin-login")
        return
      }
      const data = await parseJsonSafe(res)
      if (data?.data) setReports(data.data)
    } catch {}
  }

  const handleUpdateReport = async () => {
    if (!selectedReport) return

    const res = await fetch(`/api/reports/${selectedReport.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, response, imageBase64 }),
      credentials: "same-origin",
    })

    if (res.status === 401) {
      router.push("/admin-login")
      return
    }
    if (res.ok) {
      setIsDialogOpen(false)
      setSelectedReport(null)
      setResponse("")
      setImageBase64(null)
      fetchReports()
      // Notify other components (header) to refetch immediately
      try {
        window.dispatchEvent(new Event("reports:updated"))
      } catch (e) {}
    }
  }

  const openReportDialog = (report: Report) => {
    // Open chat modal for everyone (residents and admins)
    setChatReport(report)
    setChatModalOpen(true)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const getStatusColor = (status: string, type?: string) => {
    const isEmergency = type === "crime" || type === "missing-person"
    switch (status) {
      case "pending":
        return "destructive"
      case "in-progress":
        return "default"
      case "resolved":
        return isEmergency ? "destructive" : "secondary"
      case "closed":
        return "outline"
      default:
        return "outline"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "crime":
        return "destructive"
      case "waste":
        return "default"
      case "missing-person":
        return "destructive"
      case "infrastructure":
        return "secondary"
      default:
        return "outline"
    }
  }

  const filterReports = (status: string) => {
    if (status === "all") return reports
    return reports.filter((r) => r.status === status)
  }

  const exportReportsCSV = async (filterStatus: string = "all") => {
    try {
      const res = await fetch(`/api/reports/export?type=all&status=${filterStatus}`, { credentials: "same-origin" })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reports_${filterStatus}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Export error:", err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />

      <main className="ml-64 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports Management</h1>
            <p className="text-muted-foreground mt-1">View and respond to resident reports</p>
          </div>
          <Button variant="outline" onClick={() => exportReportsCSV("all")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Reports</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filterReports("all").map((report) => {
              const isEmergency = report.type === "crime" || report.type === "missing-person" || report.status === "pending"
              return (
              <Card
                key={report.id}
                className={cn(
                  "cursor-pointer hover:bg-accent/50 transition-colors",
                  isEmergency && "border-destructive/50 bg-destructive/5"
                )}
                onClick={() => openReportDialog(report)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        {isEmergency && (
                          <Badge variant="destructive">Emergency</Badge>
                        )}
                        <Badge variant={getTypeColor(report.type)}>{report.type}</Badge>
                        <Badge variant={getStatusColor(report.status, report.type)}>{report.status}</Badge>
                      </div>
                      <CardDescription>{new Date(report.createdAt).toLocaleString()}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{report.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {report.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {report.reporterName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {report.reporterContact}
                    </div>
                  </div>
                  {report.response && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Response:</p>
                      <p className="text-sm text-muted-foreground">{report.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {filterReports("pending").map((report) => {
              const isEmergency = report.type === "crime" || report.type === "missing-person"
              return (
              <Card
                key={report.id}
                className={cn(
                  "cursor-pointer hover:bg-accent/50 transition-colors",
                  isEmergency && "border-destructive/50 bg-destructive/5"
                )}
                onClick={() => openReportDialog(report)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        {isEmergency && (
                          <Badge variant="destructive">Emergency</Badge>
                        )}
                        <Badge variant={getTypeColor(report.type)}>{report.type}</Badge>
                      </div>
                      <CardDescription>{new Date(report.createdAt).toLocaleString()}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{report.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {report.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {report.reporterName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {report.reporterContact}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            {filterReports("in-progress").map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => openReportDialog(report)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <Badge variant={getTypeColor(report.type)}>{report.type}</Badge>
                      </div>
                      <CardDescription>{new Date(report.createdAt).toLocaleString()}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{report.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {report.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {report.reporterName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {report.reporterContact}
                    </div>
                  </div>
                  {report.response && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Response:</p>
                      <p className="text-sm text-muted-foreground">{report.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {filterReports("resolved").map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => openReportDialog(report)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <Badge variant={getTypeColor(report.type)}>{report.type}</Badge>
                      </div>
                      <CardDescription>{new Date(report.createdAt).toLocaleString()}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{report.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {report.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {report.reporterName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {report.reporterContact}
                    </div>
                  </div>
                  {report.response && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Response:</p>
                      <p className="text-sm text-muted-foreground">{report.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Report</DialogTitle>
              <DialogDescription>Update the status and add a response to this report</DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h4 className="font-medium">{selectedReport.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedReport.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedReport.reporterName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {selectedReport.reporterContact}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as ReportStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["crime", "missing-person", "missing_person", "fire", "medical", "disaster", "assault", "robbery", "hazard"].includes(selectedReport?.type || "") ? (
                        <SelectItem value="pending">Pending</SelectItem>
                      ) : null}
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response">Response</Label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={4}
                    placeholder="Add your response to the reporter..."
                  />
                </div>

                {(status === "resolved" || status === "closed") && (
                  <div className="space-y-2">
                    <Label htmlFor="proof">Attach proof (optional)</Label>
                    <input id="proof" type="file" accept="image/*" onChange={onFileChange} />
                    {imageBase64 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Image selected
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              {isOfficial && <Button onClick={handleUpdateReport}>Update Report</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat Modal */}
        {chatReport && (
          <ReportChatModal
            open={chatModalOpen}
            onOpenChange={setChatModalOpen}
            report={{
              id: chatReport.id,
              title: chatReport.title,
              status: chatReport.status,
              type: chatReport.type,
              description: chatReport.description,
              location: chatReport.location,
              reporterName: chatReport.reporterName,
              reporterContact: chatReport.reporterContact,
              createdAt: chatReport.createdAt,
            }}
            currentUserRole={role || "resident"}
          />
        )}
      </main>
    </div>
  )
}
