"use client"

import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Megaphone, Users, AlertTriangle, Clock, FileText, TrendingUp, UserCheck, BarChart3, Download } from "lucide-react"
import type { Announcement, Report } from "@/lib/types"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Stats {
  announcements: { total: number; active: number }
  reports: { total: number; pending: number; inProgress: number; resolved: number; closed: number }
  officials: { total: number; active: number }
  users: { total: number; residents: number; admins: number }
}

export function DashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([])
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [emergencyAnnouncements, setEmergencyAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    fetchStats()
    fetchAnnouncements()
    fetchReports()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats", { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) {
        setStats(data.data)
      }
    } catch {}
  }

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements", { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) {
        setRecentAnnouncements(data.data.slice(0, 5))
        setEmergencyAnnouncements(data.data.filter((a: Announcement) => a.priority === "urgent" || a.type === "emergency"))
      }
    } catch {}
  }

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports", { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) {
        setRecentReports(data.data.slice(0, 5))
      }
    } catch {}
  }

  const exportReportsCSV = async () => {
    try {
      const res = await fetch("/api/reports/export?type=all&status=all", { credentials: "same-origin" })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Export error:", err)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string, type?: string) => {
    const isEmergency = type === "crime" || type === "missing-person" || type === "missing_person"
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
    }
  }

  const reportAnalytics = stats ? {
    pendingRate: stats.reports.total > 0 ? ((stats.reports.pending / stats.reports.total) * 100).toFixed(1) : 0,
    resolvedRate: stats.reports.total > 0 ? ((stats.reports.resolved / stats.reports.total) * 100).toFixed(1) : 0,
    avgResponseTime: "2.5 days" // Placeholder - can be calculated from actual data
  } : null

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />

      <main className="ml-64 p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System overview and management</p>
        </div>

        {/* System Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Announcements"
            value={stats?.announcements.active || 0}
            description={`${stats?.announcements.total || 0} total`}
            icon={Megaphone}
          />
          <StatCard
            title="Pending Reports"
            value={stats?.reports.pending || 0}
            description={`${stats?.reports.total || 0} total reports`}
            icon={AlertTriangle}
          />
          <StatCard
            title="In Progress"
            value={stats?.reports.inProgress || 0}
            description="Being addressed"
            icon={Clock}
          />
          <StatCard
            title="Active Officials"
            value={stats?.officials.active || 0}
            description="Serving the community"
            icon={Users}
          />
        </div>

        {/* Emergency Alerts */}
        {emergencyAnnouncements.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Emergency Alerts
              </CardTitle>
              <CardDescription>Urgent announcements requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {emergencyAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-4 border border-destructive/20 rounded-md bg-white">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-destructive">{announcement.title}</h4>
                    <Badge variant="destructive">{announcement.priority}</Badge>
                  </div>
                  <p className="text-sm mb-2">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground">
                    Posted: {new Date(announcement.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Report Analytics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Report Analytics
                  </CardTitle>
                  <CardDescription>Performance metrics and statistics</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/reports">Manage Reports</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportAnalytics ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{reportAnalytics.pendingRate}%</div>
                      <div className="text-sm text-muted-foreground">Pending Rate</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{reportAnalytics.resolvedRate}%</div>
                      <div className="text-sm text-muted-foreground">Resolved Rate</div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Average Response Time</div>
                    <div className="text-xl font-semibold">{reportAnalytics.avgResponseTime}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Pending</span>
                      <span className="font-semibold">{stats?.reports.pending || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>In Progress</span>
                      <span className="font-semibold">{stats?.reports.inProgress || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Resolved</span>
                      <span className="font-semibold">{stats?.reports.resolved || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Closed</span>
                      <span className="font-semibold">{stats?.reports.closed || 0}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">Loading analytics...</p>
              )}
            </CardContent>
          </Card>

          {/* User Statistics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    User Statistics
                  </CardTitle>
                  <CardDescription>Registered users overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.users ? (
                <>
                  <div className="p-4 border rounded-lg">
                    <div className="text-3xl font-bold">{stats.users.total}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.users.residents}</div>
                      <div className="text-sm text-muted-foreground">Residents</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{stats.users.admins}</div>
                      <div className="text-sm text-muted-foreground">Admins/Officials</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">Loading user statistics...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Report Management Access */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report Management
                </CardTitle>
                <CardDescription>View and manage all resident reports</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportReportsCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button asChild>
                  <Link href="/reports">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Manage All Reports
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReports.length > 0 ? (
                recentReports.map((report) => {
                  const isEmergency = report.type === "crime" || report.type === "missing-person" || report.type === "missing_person" || report.status === "pending"
                  return (
                    <div 
                      key={report.id} 
                      className={cn(
                        "flex flex-col gap-2 p-4 border rounded-md",
                        isEmergency && "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm leading-tight">{report.title}</h4>
                            {isEmergency && (
                              <Badge variant="destructive" className="text-xs">Emergency</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{report.description}</p>
                        </div>
                        <Badge variant={getStatusColor(report.status, report.type)} className="shrink-0">
                          {report.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{report.reporterName}</span>
                        <span>•</span>
                        <span>{report.location}</span>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">No reports available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Announcements</CardTitle>
                <CardDescription>Latest updates from the barangay</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/announcements">Manage Announcements</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAnnouncements.map((announcement) => (
              <div key={announcement.id} className="flex flex-col gap-2 pb-4 border-b last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm leading-tight">{announcement.title}</h4>
                  <Badge variant={getPriorityColor(announcement.priority)} className="shrink-0">
                    {announcement.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{announcement.author}</span>
                  <span>•</span>
                  <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
