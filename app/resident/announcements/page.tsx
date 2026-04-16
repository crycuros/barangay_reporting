"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { connectRealtimeEvents } from "@/lib/client/sse"
import { ResidentHeader } from "@/components/resident-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, ThumbsUp, AlertTriangle } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  priority: string
  created_at: string
  author: string
  authorAvatarUrl?: string | null
  imageUrl?: string | null
  likes?: number
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [likedAnnouncements, setLikedAnnouncements] = useState<Set<string>>(new Set())
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setAnnouncements(data.data || [])
        const likedIds = (data.data || [])
          .filter((a: any) => a.userHasLiked)
          .map((a: any) => a.id)
        setLikedAnnouncements(new Set(likedIds))
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  // Connect SSE for real-time updates once authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    const cleanup = connectRealtimeEvents({
      onUpdate: (parsed) => {
        if (parsed?.type === 'announcements.updated') {
          fetchAnnouncements()
        }
      },
    })
    return cleanup
  }, [isAuthenticated, fetchAnnouncements])

  const loadData = async () => {
    try {
      const [sessionRes, announcementsRes] = await Promise.all([
        fetch('/api/me', { credentials: 'include' }),
        fetch('/api/announcements', { credentials: 'include' })
      ])

      if (sessionRes.status === 401) {
        router.push('/login')
        return
      }

      const sessionData = await sessionRes.json()
      const announcementsData = await announcementsRes.json()

      if (sessionData.success) {
        setUser(sessionData.data)
        setIsAuthenticated(true)
      }

      if (announcementsData.success) {
        const announcements = announcementsData.data || []
        setAnnouncements(announcements)
        // Use userHasLiked flag already returned by the API
        const likedSet = new Set<string>(
          announcements.filter((a: any) => a.userHasLiked).map((a: any) => a.id)
        )
        setLikedAnnouncements(likedSet)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (id: string) => {
    try {
      const isLiked = likedAnnouncements.has(id)
      
      // Optimistic update
      setLikedAnnouncements(prev => {
        const newSet = new Set(prev)
        if (isLiked) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })

      setAnnouncements(prev => prev.map(a => 
        a.id === id ? { 
          ...a, 
          likes: isLiked ? (a.likes || 1) - 1 : (a.likes || 0) + 1
        } : a
      ))

      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleLike: !isLiked }),
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setAnnouncements(prev => prev.map(a => 
            a.id === id ? { ...a, likes: data.data.likes } : a
          ))
        }
      }
    } catch (error) {
      console.error('Error liking announcement:', error)
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Latest updates from the barangay</p>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No announcements yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className={announcement.priority === 'urgent' ? 'border-red-300 bg-red-50/50' : ''}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      {announcement.authorAvatarUrl && (
                        <AvatarImage src={announcement.authorAvatarUrl} alt={announcement.author} />
                      )}
                      <AvatarFallback>{(announcement.author?.[0] ?? 'A').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.priority === 'urgent' && (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={announcement.type === 'emergency' ? 'destructive' : 'secondary'}>
                          {announcement.type}
                        </Badge>
                        <Badge variant="outline">
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">{announcement.author}</span>
                        {' • '}
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{announcement.content}</p>
                  
                  {announcement.imageUrl && (
                    <img 
                      src={announcement.imageUrl} 
                      alt={announcement.title}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(announcement.id)}
                      className={likedAnnouncements.has(announcement.id) ? 'text-blue-600' : ''}
                    >
                      <ThumbsUp className={`h-4 w-4 mr-2 ${likedAnnouncements.has(announcement.id) ? 'fill-current' : ''}`} />
                      {announcement.likes || 0} Likes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
