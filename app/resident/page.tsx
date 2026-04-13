"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ResidentHeader } from "@/components/resident-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Bell, Scroll, User, ArrowRight, AlertTriangle } from "lucide-react"

export default function ResidentPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    announcements: 0,
    reports: 0,
    certificates: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" })
      const data = await res.json()
      if (!data.success || !data.data) {
        router.push("/login")
        return
      }
      setUser(data.data)

      // Load stats
      const [announcementsRes, reportsRes, certsRes] = await Promise.all([
        fetch('/api/announcements', { credentials: 'include' }),
        fetch('/api/reports', { credentials: 'include' }),
        fetch('/api/certificates', { credentials: 'include' })
      ])

      const announcementsData = await announcementsRes.json()
      const reportsData = await reportsRes.json()
      const certsData = await certsRes.json()

      setStats({
        announcements: announcementsData.data?.length || 0,
        reports: reportsData.data?.length || 0,
        certificates: certsData.data?.length || 0
      })
    } catch (error) {
      console.error('Error:', error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <ResidentHeader user={user} profile={{ role: user.role, full_name: user.full_name || '' }} />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl mt-16">
        {/* Verification Banner */}
        {!user.is_verified && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">Account not verified – limited features</p>
                    <p className="text-sm text-yellow-700">Verify your identity to unlock full access including report submission.</p>
                  </div>
                </div>
                <Button onClick={() => router.push('/kyc')} className="bg-yellow-600 hover:bg-yellow-700 shrink-0">
                  Verify Identity
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {user.full_name || user.email}</h1>
          <p className="text-muted-foreground">Resident Portal - Barangay 867</p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div onClick={() => router.push('/resident/announcements')} className="cursor-pointer">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Bell className="h-8 w-8 text-blue-600" />
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.announcements}</p>
                <p className="text-sm text-muted-foreground">Announcements</p>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => router.push('/resident/reports')} className="cursor-pointer">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.reports}</p>
                <p className="text-sm text-muted-foreground">My Reports</p>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => router.push('/resident/certificates')} className="cursor-pointer">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Scroll className="h-8 w-8 text-blue-600" />
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.certificates}</p>
                <p className="text-sm text-muted-foreground">Certificates</p>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => router.push('/resident/profile')} className="cursor-pointer">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <User className="h-8 w-8 text-blue-600" />
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">Profile</p>
                <p className="text-sm text-muted-foreground">
                  {user.is_verified ? (
                    <Badge className="bg-green-600">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Not Verified</Badge>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push('/resident/reports')}
                disabled={!user.is_verified}
              >
                <FileText className="h-4 w-4 mr-2" />
                Submit New Report
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push('/resident/certificates')}
                disabled={!user.is_verified}
              >
                <Scroll className="h-4 w-4 mr-2" />
                Request Certificate
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push('/resident/announcements')}
              >
                <Bell className="h-4 w-4 mr-2" />
                View Announcements
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="secondary">{user.role.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">KYC Status</span>
                <Badge variant={user.is_verified ? 'default' : 'outline'}>
                  {user.kyc_status || 'Not Started'}
                </Badge>
              </div>
              {!user.is_verified && (
                <Button className="w-full mt-4" onClick={() => router.push('/kyc')}>
                  Complete Verification
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
