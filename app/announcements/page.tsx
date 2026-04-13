"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ThumbsUp, Image, Smile, MapPin } from "lucide-react"
import type { Announcement, AnnouncementType } from "@/lib/types"

export default function AnnouncementsPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [likedAnnouncements, setLikedAnnouncements] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "general" as AnnouncementType,
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    author: "Admin",
    image_url: null as string | null,
    location: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    readAndSetFile(file)
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null)
  const emojiPanelRef = useRef<HTMLDivElement | null>(null)
  const [emojiSearch, setEmojiSearch] = useState("")
  const [showLocationInput, setShowLocationInput] = useState(false)

  const readAndSetFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setFormData(prev => ({ ...prev, image_url: String(reader.result) }))
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    readAndSetFile(file)
  }

  const emojis = ["😊","👍","🎉","📢","📍","❤️","🙌","🔥"]
  // expanded emoji set
  const allEmojis = [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
    "😍","😘","😎","🤩","🤗","🤔","🤨","😐","😑","😶",
    "🙄","😏","😣","😥","😮","🤐","😴","🤤","😪","😵",
    "🤯","😷","🤒","🤕","🤢","🤮","🤧","🥳","😭","😤",
    "👍","👎","👏","🙌","🙏","🔥","🎉","🎊","✨","🌟",
  ]

  const toggleEmoji = () => {
    setEmojiOpen(prev => !prev)
  }

  // close emoji panel when clicking outside
  useEffect(() => {
    if (!emojiOpen) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (emojiPanelRef.current && emojiPanelRef.current.contains(target)) return
      if (emojiButtonRef.current && emojiButtonRef.current.contains(target)) return
      setEmojiOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [emojiOpen])

  const addEmoji = (emoji: string) => {
    setFormData(prev => ({ ...prev, content: (prev.content || "") + emoji }))
    setEmojiOpen(false)
  }

  const toggleLocation = () => {
    setShowLocationInput(prev => !prev)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }

  const incrementLike = async (id: string) => {
    const isCurrentlyLiked = likedAnnouncements.has(id)
    const newLikeState = !isCurrentlyLiked

    // optimistic update
    setAnnouncements((prev) => prev.map(a => a.id === id ? { ...a, likes: newLikeState ? ((a as any).likes || 0) + 1 : Math.max(0, ((a as any).likes || 0) - 1) } : a))

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
      const response = await fetch(`/api/announcements/${id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ toggleLike: newLikeState }), 
        credentials: "same-origin" 
      })
      const result = await response.json()
      
      if (result.success) {
        // Update the announcement with the response data
        setAnnouncements((prev) => prev.map(a => a.id === id ? { ...a, ...result.data } : a))
        
        // Update liked state based on response
        if (result.userHasLiked) {
          setLikedAnnouncements(prev => new Set([...prev, id]))
        } else {
          setLikedAnnouncements(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
        }
      }
    } catch (error) {
      console.error("API error:", error)
      // revert optimistic update on error
      setAnnouncements((prev) => prev.map(a => a.id === id ? { ...a, likes: isCurrentlyLiked ? ((a as any).likes || 0) + 1 : Math.max(0, ((a as any).likes || 0) - 1) } : a))
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

  useEffect(() => {
    // First check user role, then fetch announcements
    ;(async () => {
      try {
        console.log("Checking auth status...")
        const res = await fetch("/api/me", { credentials: "same-origin" })
        console.log("/api/me status:", res.status)
        if (!res.ok) {
          console.log("Not authenticated, redirecting to login")
          router.push("/admin-login")
          return
        }
        const json = await res.json()
        console.log("/api/me response:", json)
        if (json?.data?.role) {
          setUserRole(json.data.role)
          setIsAuthenticated(true)
          console.log("User authenticated, role:", json.data.role)
          
          // Only fetch announcements if authenticated
          await fetchAnnouncements(true)
        }
      } catch (error) {
        console.error("Auth check error:", error)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAnnouncements = async (force = false) => {
    // Don't fetch if not authenticated (unless forced)
    if (!isAuthenticated && !force) {
      console.log("Not authenticated, skipping fetch")
      return
    }
    
    try {
      console.log("Fetching announcements...")
      const res = await fetch("/api/announcements", { credentials: "same-origin" })
      console.log("/api/announcements status:", res.status)
      if (res.status === 401) {
        router.push("/admin-login")
        return
      }
      if (!res.ok) {
        console.log("Fetch failed")
        return
      }
      const data = await res.json()
      console.log("Announcements data:", data)
      if (data?.data) {
        setAnnouncements(data.data)
        
        // Initialize liked announcements state for residents
        const likedIds = data.data
          .filter((announcement: any) => announcement.userHasLiked)
          .map((announcement: any) => announcement.id)
        setLikedAnnouncements(new Set(likedIds))
      }
    } catch {
      // noop
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log("Submitting announcement:", formData)
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "same-origin",
      })

      console.log("POST /api/announcements status:", res.status)
      const resData = await res.json()
      console.log("POST response:", resData)

      if (res.status === 401) {
        router.push("/admin-login")
        return
      }

      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({ title: "", content: "", type: "general", priority: "medium", author: "Admin", image_url: null, location: "" })
        // Don't refetch - just add the new announcement to state
        const newAnnouncement = resData
        if (newAnnouncement?.data) {
          setAnnouncements(prev => [newAnnouncement.data, ...prev])
        }
        // Don't dispatch event to prevent other components from refetching
        // try { window.dispatchEvent(new Event("announcements:updated")) } catch (e) {}
      }
    } catch (error) {
      console.error("Submit error:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return

    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE", credentials: "same-origin" })
      if (res.status === 401) {
      router.push("/admin-login")
        return
      }
      if (res.ok) {
        // Don't refetch - just remove from state
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        // Don't dispatch event to prevent other components from refetching
        // try { window.dispatchEvent(new Event("announcements:updated")) } catch (e) {}
      }
    } catch {
      // noop
    }
  }

  const handleMarkResolved = async (id: string, newStatus: "active" | "resolved") => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "same-origin",
      })
      if (res.status === 401) {
        router.push("/admin-login")
        return
      }
      if (res.ok) {
        // Don't refetch - just update the state
        const result = await res.json()
        if (result?.data) {
          setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...result.data } : a))
        }
        // Don't dispatch event to prevent other components from refetching
        // try { window.dispatchEvent(new Event("announcements:updated")) } catch (e) {}
      }
    } catch {
      // noop
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "emergency":
        return "destructive"
      case "event":
        return "default"
      case "maintenance":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />

      <main className="ml-64 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground mt-1">Manage barangay announcements and alerts</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>Post an update to residents</DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <div className="flex gap-4 items-start">
                    <Avatar>
                      <AvatarFallback>{formData.author?.[0] ?? "A"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        id="content"
                        placeholder={`What's on your mind, ${formData.author}?`}
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={4}
                        className="text-lg placeholder:text-muted-foreground resize-none"
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">Add to your post</span>
                          <div className="relative flex items-center gap-2">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded hover:bg-muted/50" aria-label="Add photo">
                              <Image className="h-5 w-5 text-emerald-500" />
                            </button>
                            <div className="relative">
                              <div className="relative">
                                <button ref={emojiButtonRef} type="button" onClick={toggleEmoji} className="p-2 rounded hover:bg-muted/50" aria-label="Add emoji">
                                  <Smile className="h-5 w-5 text-amber-400" />
                                </button>
                                {emojiOpen ? (
                                  <div ref={emojiPanelRef} className="absolute z-20 mt-2 left-0 bg-card border rounded shadow p-2 w-72">
                                    <div className="flex items-center gap-2 mb-2">
                                      <input
                                        value={emojiSearch}
                                        onChange={(e) => setEmojiSearch(e.target.value)}
                                        placeholder="Search emojis"
                                        className="w-full rounded px-2 py-1 border bg-transparent text-sm"
                                      />
                                    </div>
                                    <div className="mb-2 flex gap-1">
                                      <button type="button" onClick={() => setEmojiSearch("")} className="text-xs px-2 py-1 rounded bg-muted/20">All</button>
                                      <button type="button" onClick={() => setEmojiSearch("") } className="text-xs px-2 py-1 rounded bg-muted/10">Smileys</button>
                                      <button type="button" onClick={() => setEmojiSearch("") } className="text-xs px-2 py-1 rounded bg-muted/10">Hearts</button>
                                    </div>
                                    <div className="grid grid-cols-8 gap-1 max-h-40 overflow-auto">
                                      {allEmojis.filter(e => (emojiSearch ? e.includes(emojiSearch) : true)).map(e => (
                                        <button key={e} type="button" onClick={() => addEmoji(e)} className="p-2 text-lg hover:bg-muted/50 rounded">{e}</button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div>
                              <button type="button" onClick={toggleLocation} className="p-2 rounded hover:bg-muted/50" aria-label="Add location">
                                <MapPin className="h-5 w-5 text-rose-500" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          {/* type select kept but small */}
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value as AnnouncementType })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <input ref={(el) => { fileInputRef.current = el }} id="image" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                      {formData.image_url ? (
                        <div className="mt-3 rounded overflow-hidden border">
                          <img src={formData.image_url} alt="preview" className="w-full object-cover max-h-72" />
                        </div>
                      ) : null}

                      {showLocationInput ? (
                        <div className="mt-3">
                          <Input
                            placeholder="Enter location (optional)"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!(formData.content.trim().length > 0 || formData.image_url)}>
                    Post
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      <Badge variant={getTypeColor(announcement.type)}>{announcement.type}</Badge>
                      <Badge variant={getPriorityColor(announcement.priority)}>{announcement.priority}</Badge>
                      {(announcement as any).status === "resolved" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
                      )}
                    </div>
                    <CardDescription>
                      By {announcement.author} • {new Date(announcement.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {(announcement.type === "emergency" || announcement.priority === "urgent") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkResolved(announcement.id, (announcement as any).status === "resolved" ? "active" : "resolved")}
                        className={`${(announcement as any).status === "resolved" ? "bg-green-50 text-green-700 border-green-200" : "text-amber-700 border-amber-200"}`}
                      >
                        {(announcement as any).status === "resolved" ? "✓ Resolved" : "Mark Resolved"}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                {announcement.imageUrl ? (
                  <div className="mt-3">
                    <img src={announcement.imageUrl} alt={announcement.title} className="w-full max-h-72 object-cover rounded" />
                  </div>
                ) : null}
                {announcement.location ? (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> {announcement.location}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  {userRole === "resident" ? (
                    <Button size="sm" variant="ghost" onClick={() => incrementLike(announcement.id)}>
                      <ThumbsUp className={`h-4 w-4 mr-2 transition-all duration-300 ${likedAnnouncements.has(announcement.id) ? "fill-current text-blue-700 scale-125" : "scale-100"}`} /> {(announcement as any).likes || 0}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ThumbsUp className="h-4 w-4 opacity-70" /> {(announcement as any).likes || 0} likes
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
