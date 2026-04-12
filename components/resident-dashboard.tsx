"use client"

import { useEffect, useState } from "react"
import { ResidentHeader } from "@/components/resident-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Input } from "@/components/ui/input"
import type { Report, ReportStatus } from "@/lib/types"
import { FileText, AlertTriangle, Bell, MapPin, Clock, Upload, Rss, Scroll, ThumbsUp, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"
import { DashboardSkeleton, HeaderSkeleton } from "@/components/skeleton-loader"
import { ReportChatModal } from "@/components/report-chat-modal"

type Announcement = {
  id: string
  title: string
  content: string
  type: string
  priority: string
  created_at: string
  author: string
  imageUrl?: string | null
  likes?: number
  location?: string | null
}

interface ResidentDashboardProps {
  user: {
    id: string
    email: string
    full_name: string | null
    role: string
    avatar_url?: string | null
    is_verified?: boolean
    kyc_status?: string
  }
  profile: { role: string; full_name: string }
  residentProfile?: any
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "Ngayon lang"
  if (diffMins < 60) return `${diffMins} minuto ang nakalipas`
  if (diffHours < 24) return `${diffHours} oras ang nakalipas`
  if (diffDays < 7) return `${diffDays} araw ang nakalipas`
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
}

export function ResidentDashboard({ user, profile, residentProfile }: ResidentDashboardProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const isVerified = user.is_verified ?? false
  const kycStatus = user.kyc_status || "none"
  const [isLoading, setIsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [activeTab, setActiveTab] = useState("feed")
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportForm, setReportForm] = useState({
    title: "",
    description: "",
    type: "other" as ReportStatus,
    location: "",
    contact: "",
    image: null as File | null
  })
  const [profileData, setProfileData] = useState<any>(null)
  const [isKycDialogOpen, setIsKycDialogOpen] = useState(false)
  const [kycImage, setKycImage] = useState<File | null>(null)
  const [kycSubmitting, setKycSubmitting] = useState(false)
  const [certificates, setCertificates] = useState<any[]>([])
  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false)
  const [certForm, setCertForm] = useState({ type: "barangay-clearance", purpose: "" })
  const [certSubmitting, setCertSubmitting] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [likedAnnouncements, setLikedAnnouncements] = useState<Set<string>>(new Set())
  const [animatingLikes, setAnimatingLikes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchAnnouncements(),
          fetchUserReports(),
          fetchResidentProfile(),
          fetchCertificates()
        ])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : ""
    if (hash === "reports") setActiveTab("reports")
    else if (hash === "announcements") setActiveTab("announcements")
    else setActiveTab("feed")
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash === "reports") setActiveTab("reports")
      else if (hash === "announcements") setActiveTab("announcements")
      else setActiveTab("feed")
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const fetchCertificates = async () => {
    try {
      const res = await fetch("/api/certificates", { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) setCertificates(data.data)
    } catch {}
  }

  const handleSubmitCert = async () => {
    if (!certForm.purpose.trim()) return
    setCertSubmitting(true)
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(certForm),
      })
      const data = await res.json()
      if (data.success) {
        setIsCertDialogOpen(false)
        setCertForm({ type: "barangay-clearance", purpose: "" })
        fetchCertificates()
      } else {
        alert(data.error || "Failed to submit certificate request")
      }
    } catch (e) {
      alert("Failed to submit certificate request")
    }
    setCertSubmitting(false)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "reports") window.location.hash = "reports"
    else if (value === "announcements") window.location.hash = "announcements"
    else window.history.replaceState(null, "", "/resident")
  }

  const fetchResidentProfile = async () => {
    try {
      const res = await fetch(`/api/resident/profile?userId=${user.id}`, { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) setProfileData(data.data.profile)
    } catch {}
  }

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements", { credentials: "same-origin" })
      const data = await res.json()
      if (data?.data) {
        setAnnouncements(data.data)
        const likedIds = data.data
          .filter((a: any) => a.userHasLiked)
          .map((a: any) => String(a.id))
        setLikedAnnouncements(new Set(likedIds))
      }
    } catch {}
  }

  const incrementLike = async (id: string) => {
    const isCurrentlyLiked = likedAnnouncements.has(id)
    const newLikeState = !isCurrentlyLiked

    setAnimatingLikes(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setTimeout(() => {
      setAnimatingLikes(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 500)

    // optimistic update
    setAnnouncements(prev => prev.map(a => 
      a.id === id ? { 
        ...a, 
        likes: newLikeState ? (a.likes || 0) + 1 : Math.max(0, (a.likes || 0) - 1)
      } : a
    ))

    // update liked set
    if (newLikeState) {
      setLikedAnnouncements(prev => new Set([...prev, id]))
    } else {
      setLikedAnnouncements(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }

    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleLike: newLikeState }),
        credentials: "same-origin",
      })
      if (res.ok) {
        const json = await res.json()
        if (json?.success && json?.data) {
          const updatedLikes =
            typeof json.data.likes === "number" ? json.data.likes : Number(json.data.likes) || 0
          setAnnouncements(prev =>
            prev.map(a => (a.id === id ? { ...a, likes: updatedLikes } : a))
          )
          const serverLiked: boolean = !!json.userHasLiked
          setLikedAnnouncements(prev => {
            const next = new Set(prev)
            if (serverLiked) next.add(id)
            else next.delete(id)
            return next
          })
        }
      } else {
        throw new Error("Failed to update like")
      }
    } catch (e) {
      // failed — revert optimistic state
      setAnnouncements(prev => prev.map(a => 
        a.id === id ? { 
          ...a, 
          likes: isCurrentlyLiked ? (a.likes || 0) + 1 : Math.max(0, (a.likes || 0) - 1)
        } : a
      ))
      if (isCurrentlyLiked) {
        setLikedAnnouncements(prev => new Set([...prev, id]))
      } else {
        setLikedAnnouncements(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }
    }
  }

  const fetchUserReports = async () => {
    try {
      const res = await fetch("/api/reports", { credentials: "same-origin" })
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = await res.json()
      if (data?.data) {
        setReports(data.data.filter((r: Report) => r.reporterName === profile.full_name || r.reporterContact === user.email))
      }
    } catch {}
  }

  const handleSubmitReport = async () => {
    try {
      const formData = new FormData()
      formData.append("title", reportForm.title)
      formData.append("description", reportForm.description)
      formData.append("type", reportForm.type)
      formData.append("location", reportForm.location)
      formData.append("reporterName", profile.full_name || user.email)
      formData.append("reporterContact", reportForm.contact || user.email)
      if (reportForm.image) formData.append("image", reportForm.image)

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      })

      if (res.ok) {
        setIsReportDialogOpen(false)
        setReportForm({ title: "", description: "", type: "infrastructure", location: "", contact: "", image: null })
        fetchUserReports()
      }
    } catch {}
  }

  const handleSubmitKyc = async () => {
    if (!kycImage) return
    setKycSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("id_image", kycImage)
      const res = await fetch("/api/resident/kyc", { method: "POST", body: formData, credentials: "same-origin" })
      if (res.ok) {
        setIsKycDialogOpen(false)
        setKycImage(null)
        router.refresh()
      }
    } catch {}
    setKycSubmitting(false)
  }

  const getStatusColor = (status: string, type?: string) => {
    const isEmergency = ["crime", "missing-person", "missing_person", "fire", "medical", "disaster", "assault", "robbery", "hazard"].includes(type)
    switch (status) {
      case "pending": return "destructive"
      case "in-progress": return "default"
      case "resolved": return isEmergency ? "destructive" : "secondary"
      case "closed": return "outline"
      default: return "outline"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive"
      case "high": return "destructive"
      case "medium": return "default"
      case "low": return "secondary"
      default: return "outline"
    }
  }

  const emergencies = announcements.filter(a => (a.priority === "urgent" || a.type === "emergency") && ((a as any).status === "active" || !(a as any).status))
  const pendingReports = reports.filter(r => r.status === "pending").length
  const resolvedReports = reports.filter(r => r.status === "resolved" || r.status === "closed").length
  const displayName = profile.full_name || user.email

  // Newsfeed: announcements first (newest), then active reports (pending/in-progress only)
  const feedItems = [
    ...announcements.map(a => ({
      type: "announcement" as const,
      id: a.id,
      date: a.created_at,
      data: a
    })),
    ...reports.filter(r => r.status === "pending" || r.status === "in-progress").map(r => ({
      type: "report" as const,
      id: r.id,
      date: r.createdAt,
      data: r
    }))
  ].sort((a, b) => {
    // Announcements appear before reports
    if (a.type !== b.type) {
      return a.type === "announcement" ? -1 : 1
    }
    // Within same type, newest first
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="min-h-screen bg-background">
      {isLoading ? (
        <HeaderSkeleton />
      ) : (
        <ResidentHeader
          userEmail={user.email}
          fullName={profile.full_name ?? ""}
          avatarUrl={user.avatar_url}
          isVerified={isVerified}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onAvatarChange={() => router.refresh()}
        />
      )}

      <main className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Unverified banner */}
            {!isVerified && (
              <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">Account not verified – limited features</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">Verify your identity to unlock full access including report submission.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-400 shrink-0"
                    onClick={() => router.push('/kyc')}
                  >
                    Verify Identity
                  </Button>
                </div>
              </section>
            )}

            {/* Welcome + Submit CTA */}
            <section className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("welcome")}, {displayName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Resident Portal · Brgy. 867</p>
            </div>
            <Button
              onClick={() => setIsReportDialogOpen(true)}
              size="default"
              className="shrink-0"
              disabled={!isVerified}
              title={!isVerified ? t("unverifiedDesc") : undefined}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("submitReport")}
            </Button>
          </div>
        </section>

        {/* Emergency banner - always on top when present */}
        {emergencies.length > 0 && (
          <section className="mb-6 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="font-semibold text-sm text-destructive">{t("emergency")}</span>
            </div>
            <div className="space-y-2">
              {emergencies.slice(0, 2).map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-background/80 border border-destructive/20">
                  <h3 className="font-medium text-sm text-destructive">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabbed content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-11 mb-6 bg-muted/60">
            <TabsTrigger value="feed" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Rss className="h-4 w-4 shrink-0" />
              {t("feed")}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4 shrink-0" />
              {t("myReports")}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4 shrink-0" />
              {t("announcements")}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Scroll className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Certificates</span>
              <span className="sm:hidden">Certs</span>
            </TabsTrigger>
          </TabsList>

          {/* FEED TAB - Newsfeed style */}
          <TabsContent value="feed" className="mt-0">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Pinakabagong abiso at updates mula sa barangay.</p>
              {feedItems.length > 0 ? (
                feedItems.map((item) => (
                  item.type === "announcement" ? (
                    <article
                      key={`ann-${item.id}`}
                      className={cn(
                        "rounded-xl border bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md",
                        (item.data as Announcement).priority === "urgent" || (item.data as Announcement).type === "emergency"
                          ? "border-destructive/30 bg-destructive/5"
                          : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bell className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{(item.data as Announcement).title}</h3>
                            <p className="text-[11px] text-muted-foreground">{formatRelativeTime(item.date)} · {(item.data as Announcement).author}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor((item.data as Announcement).priority)} className="text-xs shrink-0">
                            {(item.data as Announcement).priority}
                          </Badge>
                          {(item.data as any).status === "resolved" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="pl-11">
                        <p className="text-sm text-muted-foreground">{(item.data as Announcement).content}</p>
                        {(item.data as Announcement).imageUrl ? (
                          <img src={(item.data as Announcement).imageUrl} alt={(item.data as Announcement).title} className="mt-2 w-full max-h-48 object-cover rounded" />
                        ) : null}
                        {(item.data as Announcement).location ? (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> {(item.data as Announcement).location}</p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-3">
                          {user.role === "resident" ? (
                            <Button size="sm" variant="ghost" onClick={() => incrementLike(item.id)} className="relative">
                              <span className="relative mr-2 inline-flex items-center justify-center">
                                {animatingLikes.has(item.id) ? (
                                  <span className="-z-0 absolute inset-0 -m-1 rounded-full bg-blue-500/30 animate-ping" />
                                ) : null}
                                <ThumbsUp className={`relative z-10 h-4 w-4 transition-all duration-300 ${likedAnnouncements.has(item.id) ? "fill-current text-blue-700 scale-125" : "scale-100"} ${animatingLikes.has(item.id) ? "animate-bounce" : ""}`} />
                              </span>
                              {(item.data as Announcement).likes || 0}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">{(item.data as Announcement).likes || 0} likes</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ) : (
                    <article
                      key={`rep-${item.id}`}
                      className={cn(
                        "rounded-xl border bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md",
                        ["crime", "missing-person", "missing_person", "fire", "medical", "disaster", "assault", "robbery", "hazard"].includes((item.data as Report).type)
                          ? "border-destructive/20 bg-destructive/5"
                          : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{(item.data as Report).title}</h3>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {(item.data as Report).location} · {formatRelativeTime(item.date)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor((item.data as Report).status, (item.data as Report).type)} className="shrink-0">
                          {(item.data as Report).status.replace("-", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground pl-11 mt-2 line-clamp-2">{(item.data as Report).description}</p>
                    </article>
                  )
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                  <Rss className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("noUpdates")}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* MY REPORTS TAB */}
          <TabsContent value="reports" className="mt-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold">{reports.length}</div>
                  <div className="text-xs text-muted-foreground">{t("totalReports")}</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200/50">
                  <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingReports}</div>
                  <div className="text-xs text-muted-foreground">{t("pending")}</div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50">
                  <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{resolvedReports}</div>
                  <div className="text-xs text-muted-foreground">{t("resolved")}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3">{t("reports")}</h3>
                {reports.length > 0 ? (
                  <div className="space-y-3">
                    {reports.map((report) => {
                      const isEmerg = ["crime", "missing-person", "missing_person", "fire", "medical", "disaster", "assault", "robbery", "hazard"].includes(report.type) || report.status === "pending"
                      return (
                        <Card
                          key={report.id}
                          className={cn(
                            "overflow-hidden transition-shadow hover:shadow-md",
                            isEmerg && "border-destructive/30 bg-destructive/5"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm">{report.title}</h4>
                                  {isEmerg && <Badge variant="destructive" className="text-[10px]">Emergency</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {report.location}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {new Date(report.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {report.response && (
                                  <div className="mt-3 p-2 rounded-md bg-muted/50 text-xs">
                                    <span className="font-medium">Response:</span> {report.response}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Badge variant={getStatusColor(report.status, report.type)} className="shrink-0 self-start">
                                  {report.status.replace("-", " ")}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0"
                                  onClick={() => {
                                    setSelectedReport(report)
                                    setChatModalOpen(true)
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("noReports")}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsReportDialogOpen(true)} disabled={!isVerified}>
                        {t("submitReport")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ANNOUNCEMENTS TAB */}
          <TabsContent value="announcements" className="mt-0">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("allAnnouncements")}</p>
              {announcements.length > 0 ? (
                announcements.map((a) => (
                  <Card
                    key={a.id}
                    className={cn(
                      "overflow-hidden transition-shadow hover:shadow-md",
                      (a.priority === "urgent" || a.type === "emergency") && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                  <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm">{a.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(a.priority)} className="text-xs shrink-0">{a.priority}</Badge>
                          {(a as any).status === "resolved" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.content}</p>
                      {a.imageUrl ? <img src={a.imageUrl} alt={a.title} className="mt-2 w-full max-h-56 object-cover rounded" /> : null}
                      {a.location ? <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</p> : null}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{a.author} · {formatRelativeTime(a.created_at)}</p>
                        {user.role === "resident" ? (
                          <Button size="sm" variant="ghost" onClick={() => incrementLike(a.id)}>
                            <ThumbsUp className={`h-4 w-4 mr-2 transition-all duration-300 ${likedAnnouncements.has(a.id) ? "fill-current text-blue-700 scale-125" : "scale-100"}`} /> {a.likes || 0}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ThumbsUp className="h-4 w-4 opacity-70" /> {a.likes || 0} likes
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("noAnnouncements")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* CERTIFICATES TAB */}
          <TabsContent value="certificates" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Request certificates and clearances.</p>
                <Button size="sm" onClick={() => setIsCertDialogOpen(true)} disabled={!isVerified}>
                  <Scroll className="h-4 w-4 mr-1" /> Request Certificate
                </Button>
              </div>
              {!isVerified && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                  {t("unverifiedDesc")}
                </div>
              )}
              {certificates.length > 0 ? (
                certificates.map((cert: any) => (
                  <Card key={cert.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {cert.type === "barangay-clearance" ? "Barangay Clearance" :
                               cert.type === "residency" ? "Certificate of Residency" :
                               cert.type === "indigency" ? "Certificate of Indigency" :
                               cert.type === "business-permit" ? "Business Permit" :
                               cert.type === "cedula" ? "Cedula / CTC" : cert.type}
                            </span>
                            <Badge variant={
                              cert.status === "pending" ? "destructive" :
                              cert.status === "approved" ? "default" :
                              cert.status === "ready" ? "secondary" : "outline"
                            }>
                              {cert.status === "ready" ? "Ready for Pickup" : cert.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cert.purpose}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested: {new Date(cert.createdAt).toLocaleDateString()}
                            {cert.processedAt && ` · Processed: ${new Date(cert.processedAt).toLocaleDateString()}`}
                          </p>
                          {cert.adminNotes && (
                            <p className="text-xs bg-muted/50 rounded p-2 mt-2">Note: {cert.adminNotes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Scroll className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No certificate requests yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Submit Report Dialog */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("submitReport")}</DialogTitle>
              <DialogDescription>Report community issues, concerns, or emergencies</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={reportForm.title}
                  onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Maikling pamagat ng report..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={reportForm.description}
                  onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Detalyadong description ng issue..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Uri ng Report</Label>
                <Select value={reportForm.type} onValueChange={(v) => setReportForm(prev => ({ ...prev, type: v as ReportStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crime">Crime & Security (Emergency)</SelectItem>
                    <SelectItem value="missing-person">Missing Person (Emergency)</SelectItem>
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
              <div className="space-y-2">
                <Label htmlFor="location">Lokasyon</Label>
                <Input
                  id="location"
                  value={reportForm.location}
                  onChange={(e) => setReportForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Street, Block number..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  value={reportForm.contact}
                  onChange={(e) => setReportForm(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Para sa follow-up"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Attach Photo (Optional)</Label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={(e) => setReportForm(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                />
                {reportForm.image && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Upload className="h-3 w-3" /> {reportForm.image.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>{t("cancel")}</Button>
              <Button onClick={handleSubmitReport}>{t("submit")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KYC Verify Dialog */}
        <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("kycTitle")}</DialogTitle>
              <DialogDescription>{t("kycDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="kyc-image">{t("uploadId")}</Label>
                <input
                  id="kyc-image"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={(e) => setKycImage(e.target.files?.[0] || null)}
                />
                {kycImage && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Upload className="h-3 w-3" /> {kycImage.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsKycDialogOpen(false); setKycImage(null) }}>
                {t("cancel")}
              </Button>
              <Button onClick={handleSubmitKyc} disabled={!kycImage || kycSubmitting}>
                {kycSubmitting ? "Submitting..." : t("submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Certificate Request Dialog */}
        <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Certificate</DialogTitle>
              <DialogDescription>Select the type of certificate and provide the purpose.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Certificate Type</Label>
                <Select value={certForm.type} onValueChange={(v) => setCertForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barangay-clearance">Barangay Clearance</SelectItem>
                    <SelectItem value="residency">Certificate of Residency</SelectItem>
                    <SelectItem value="indigency">Certificate of Indigency</SelectItem>
                    <SelectItem value="business-permit">Business Permit</SelectItem>
                    <SelectItem value="cedula">Cedula / CTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea
                  value={certForm.purpose}
                  onChange={(e) => setCertForm(p => ({ ...p, purpose: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Employment, School enrollment, Business..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCertDialogOpen(false)}>{t("cancel")}</Button>
              <Button onClick={handleSubmitCert} disabled={!certForm.purpose.trim() || certSubmitting}>
                {certSubmitting ? "Submitting..." : "Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat Modal */}
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
              reporterName: selectedReport.reporterName,
              reporterContact: selectedReport.reporterContact,
              createdAt: selectedReport.createdAt,
            }}
            currentUserRole="resident"
          />
        )}
          </>
        )}
      </main>
    </div>
  )
}
