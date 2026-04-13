"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ResidentHeader } from "@/components/resident-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, ThumbsUp, MessageCircle, AlertTriangle } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  priority: string
  created_at: string
  author: string
  imageUrl?: string | null
  likes?: number
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [likedAnnouncements, setLikedAnnouncements] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

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
      }

      if (announcementsData.success) {
        const announcements = announcementsData.data || []
        setAnnouncements(announcements)
        
        // Load liked state for each announcement
        if (sessionData.data?.id) {
          const likedSet = new Set<string>()
          for (const announcement of announcements) {
            try {
              const res = await fetch(`/api/announcements/${announcement.id}/liked`, { 
                credentials: 'include' 
              })
              const data = await res.json()
              if (data.userHasLiked) {
                likedSet.add(announcement.id)
              }
            } catch (err) {
              console.error('Error checking like status:', err)
            }
          }
          setLikedAnnouncements(likedSet)
        }
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {announcement.priority === 'urgent' && (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <CardTitle>{announcement.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={announcement.type === 'emergency' ? 'destructive' : 'secondary'}>
                          {announcement.type}
                        </Badge>
                        <Badge variant="outline">
                          {announcement.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{announcement.content}</p>
                  
                  {announcement.imageUrl && (
                    <img 
                      src={String(announcement.imageUrl)} 
                      alt={announcement.title}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>By {announcement.author}</span>
                    <span>•</span>
                    <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                  </div>

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
