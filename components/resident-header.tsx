"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"
import { LogOut, Bell, FileText, Menu, Rss, CheckCircle2, Camera, Scroll } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

const residentNavItems = [
  { path: "/resident", labelKey: "feed", icon: Rss },
  { path: "/resident/reports", labelKey: "myReports", icon: FileText },
  { path: "/resident/announcements", labelKey: "announcements", icon: Bell },
  { path: "/resident/certificates", labelKey: "certificates", icon: Scroll },
]

function getInitials(name: string, email: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) return email[0].toUpperCase()
  return "?"
}

export function ResidentHeader({
  onAvatarChange,
  userEmail,
  fullName,
  avatarUrl,
  isVerified,
  activeTab = "feed",
  onTabChange,
  user,
  profile,
}: {
  userEmail?: string
  fullName?: string
  avatarUrl?: string | null
  isVerified?: boolean
  activeTab?: string
  onTabChange?: (tab: string) => void
  onAvatarChange?: () => void
  user?: any
  profile?: any
}) {
  const router = useRouter()
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { lang, setLang, t } = useLanguage()
  const [fileInputKey, setFileInputKey] = useState(0)
  
  // Use user object if provided, otherwise use individual props
  const displayEmail = user?.email || userEmail || ''
  const displayName = user?.full_name || fullName || ''
  const displayAvatar = user?.avatar_url || avatarUrl || null
  const displayVerified = user?.is_verified || isVerified || false

  const handleNavClick = (path: string) => {
    router.push(path)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log("Avatar upload triggered, file:", file?.name, file?.type, file?.size)
    if (!file || !file.type.startsWith("image/")) {
      console.log("File validation failed")
      setFileInputKey(prev => prev + 1)
      return
    }
    try {
      const createBase64 = async () => {
        const img = document.createElement("img")
        const reader = new FileReader()
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error("read"))
          reader.readAsDataURL(file)
        })
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.src = dataUrl
        })
        const canvas = document.createElement("canvas")
        const maxSize = 256
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = Math.max(1, Math.floor(img.width * ratio))
        canvas.height = Math.max(1, Math.floor(img.height * ratio))
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("ctx")
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        let quality = 0.8
        let out = canvas.toDataURL("image/jpeg", quality)
        while (out.length > 58000 && quality > 0.4) {
          quality -= 0.1
          out = canvas.toDataURL("image/jpeg", quality)
        }
        return out
      }
      const base64 = await createBase64()
      const formData = new FormData()
      formData.append("base64", base64)
      console.log("Uploading to /api/resident/avatar...")
      const res = await fetch("/api/resident/avatar", { method: "POST", body: formData, credentials: "same-origin" })
      console.log("Response status:", res.status)
      if (res.ok) {
        console.log("Upload successful!")
        alert("Profile picture updated!")
        onAvatarChange?.()
      } else {
        const error = await res.json()
        console.error("Avatar upload failed:", error)
        alert(`Upload failed: ${error.error || "Unknown error"}`)
      }
    } catch (err) {
      console.error("Avatar upload error:", err)
      alert("Failed to upload avatar. Please try again.")
    }
    // Always reset the file input key to allow re-selection
    setFileInputKey(prev => prev + 1)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    // Use window.location for full page reload to clear all cached state
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-6xl mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link href="/resident" className="flex items-center gap-2 shrink-0">
            <img 
              src="/logo.png" 
              alt="Barangay 867 Logo" 
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain"
            />
            <div className="flex flex-col hidden sm:block">
              <span className="font-semibold text-sm leading-none">{t("residentPortal")}</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Brgy. 867</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {residentNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path || (item.path === "/resident" && pathname === "/resident")
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language selector */}
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                lang === "en" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("tl")}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                lang === "tl" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              TL
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-9 pl-1 pr-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={displayAvatar ?? undefined} alt={displayName || displayEmail} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {getInitials(displayName, displayEmail)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[100px] truncate text-sm">{displayName || displayEmail}</span>
                {displayVerified && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" title={t("verified")} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="text-xs text-muted-foreground">{t("residentAccount")}</span>
                <p className="font-medium truncate mt-0.5 flex items-center gap-1">
                  {displayName || displayEmail}
                  {displayVerified && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              <DropdownMenuItem onSelect={(e) => {
                console.log("Menu item selected, about to click input")
                e.preventDefault()
                setTimeout(() => {
                  console.log("FileInputRef current:", fileInputRef.current)
                  fileInputRef.current?.click()
                }, 0)
              }}>
                <Camera className="h-4 w-4 mr-2" />
                Change profile photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <nav className="flex flex-col gap-1 mt-8">
                {residentNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.path
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors w-full text-left",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {t(item.labelKey)}
                    </button>
                  )
                })}
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5" />
                    {t("logout")}
                  </button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
