"use client"

import { Button } from "@/components/ui/button"
import { LogOut, User, Bell, Volume2, VolumeX } from "lucide-react"
import { useAuth } from "@/lib/auth/context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState, useRef } from "react"

export function AdminHeader() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [notificationCount, setNotificationCount] = useState(0)
  // emergencyReportsCount: pending resident reports with emergency priority/type
  const [emergencyReportsCount, setEmergencyReportsCount] = useState(0)
  // announcementsEmergencyCount: emergency/urgent announcements (UI-only)
  const [announcementsEmergencyCount, setAnnouncementsEmergencyCount] = useState(0)
  const audioCtxRef = useRef<any>(null)
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [alarmMuted, setAlarmMuted] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  // expose fetchNotifications so other components can request an immediate refresh
  const fetchNotificationsRef = useRef<() => Promise<void> | null>(null)

  // Load alertsEnabled from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alertsEnabled")
      if (saved === "true") {
        setAlertsEnabled(true)
      }
    } catch (e) {}
  }, [])

  // Persist alertsEnabled to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("alertsEnabled", alertsEnabled.toString())
    } catch (e) {}
  }, [alertsEnabled])

  useEffect(() => {
    // Fetch notification count (pending reports + emergency announcements)
    const fetchNotifications = async () => {
      try {
        const [reportsRes, announcementsRes] = await Promise.all([
          fetch("/api/reports", { credentials: "same-origin" }),
          fetch("/api/announcements", { credentials: "same-origin" }),
        ])
        const reportsData = await reportsRes.json()
        const announcementsData = await announcementsRes.json()

        const pendingReports = reportsData?.data?.filter((r: any) => 
          r.status === "pending" && ["crime", "missing_person", "missing-person", "fire", "medical", "disaster", "assault", "robbery", "hazard", "abuse"].includes(r.type)
        ).length || 0
        // Sound alarm for ALL pending reports (not just marked emergency)
        const announcementsEmergencies = announcementsData?.data?.filter((a: any) => a.priority === "urgent" || a.type === "emergency").length || 0

        setNotificationCount(pendingReports)
        setEmergencyReportsCount(pendingReports)
        setAnnouncementsEmergencyCount(announcementsEmergencies)
      } catch {}
    }

    // expose for external triggers
    fetchNotificationsRef.current = fetchNotifications

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5000) // Refresh every 5s for near-realtime

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    const handleExternal = () => {
      // another component (reports page or announcements page) signaled an update — refetch immediately
      try { fetchNotificationsRef.current && fetchNotificationsRef.current() } catch {}
    }
    window.addEventListener("reports:updated", handleExternal)
    window.addEventListener("announcements:updated", handleExternal)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("reports:updated", handleExternal)
      window.removeEventListener("announcements:updated", handleExternal)
    }
  }, [])

  // Play a short alert tone repeatedly while there are pending emergency REPORTS.
  useEffect(() => {
    const createAudioCtx = () => {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return null
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      return audioCtxRef.current
    }

    const pulse = async () => {
      if (alarmMuted || !alertsEnabled) return
      try {
        const audioCtx = createAudioCtx()
        if (!audioCtx) return
        if (audioCtx.state === "suspended") {
          try { await audioCtx.resume() } catch {}
        }

        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(880, audioCtx.currentTime)
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()

        const now = audioCtx.currentTime
        gain.gain.linearRampToValueAtTime(0.6, now + 0.02)
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.45)

        // Stop and disconnect after the pulse
        setTimeout(() => {
          try { osc.stop() } catch {}
          try { osc.disconnect() } catch {}
          try { gain.disconnect() } catch {}
        }, 500)
      } catch (e) {}
    }

    const startAlarm = () => {
      if (alarmIntervalRef.current) return
      pulse()
      alarmIntervalRef.current = setInterval(pulse, 1000)
    }

    const stopAlarm = () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }

    if (emergencyReportsCount > 0) {
      startAlarm()
    } else {
      stopAlarm()
    }

    return () => stopAlarm()
  }, [emergencyReportsCount, alarmMuted, alertsEnabled])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    // Use window.location for full page reload to clear all cached state
    window.location.href = "/admin-login"
  }

  const enableAlerts = async () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      if (audioCtxRef.current.state === "suspended") {
        try { await audioCtxRef.current.resume() } catch {}
      }
      setAlertsEnabled(true)
    } catch (e) {}
  }

  const disableAlerts = async () => {
    setAlertsEnabled(false)
    try {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
      if (audioCtxRef.current) {
        try { await audioCtxRef.current.close() } catch {}
        audioCtxRef.current = null
      }
    } catch (e) {}
  }

  const getInitials = (name: string | null, email: string) => {
    if (name?.trim()) {
      return name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const totalNotifications = notificationCount + announcementsEmergencyCount
  const totalEmergencies = emergencyReportsCount + announcementsEmergencyCount
  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b bg-background">
        <div className="flex h-full items-center justify-between px-6 ml-64">
        <div className="flex items-center gap-4">
          {totalEmergencies > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5">
              <span className="text-sm font-medium text-destructive">
                {totalEmergencies} Emergency{totalEmergencies !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/reports">
              <Bell className="h-5 w-5" />
              {totalNotifications > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-semibold">
                  {totalNotifications > 9 ? "9+" : totalNotifications}
                </Badge>
              )}
            </Link>
          </Button>

          {/* Alerts control */}
          {!alertsEnabled ? (
            <Button size="sm" variant="outline" onClick={enableAlerts} className="ml-2">
              Enable Alerts
            </Button>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button size="icon" variant="ghost" onClick={() => setAlarmMuted(prev => !prev)} aria-pressed={alarmMuted}>
                {alarmMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={disableAlerts}>
                Disable Alerts
              </Button>
            </div>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 pl-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={currentUser?.avatar_url ?? undefined} alt={currentUser?.full_name || currentUser?.email} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {currentUser?.email ? getInitials(currentUser.full_name, currentUser.email) : "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[150px] truncate">{currentUser?.full_name || currentUser?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser?.full_name || currentUser?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">Administrator</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </header>

      {/* Side pulsing red glow when there are pending emergencies */}
      {emergencyReportsCount > 0 && (
        <div
          aria-hidden
          className="fixed right-0 top-1/4 h-48 w-4 rounded-l-full bg-destructive/80 animate-pulse z-50 pointer-events-none"
          style={{ boxShadow: "0 0 30px rgba(220,38,38,0.6)" }}
        />
      )}
    </>
  )
}
