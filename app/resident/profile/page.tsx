"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ResidentHeader } from "@/components/resident-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Shield, Calendar, CheckCircle, Clock, Camera, Upload } from "lucide-react"

export default function ResidentProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Get user data
      const res = await fetch("/api/me", { credentials: "include" })
      const data = await res.json()
      
      if (!data.success || !data.data) {
        router.push("/login")
        return
      }

      console.log("User data loaded:", data.data) // Debug log
      setUser(data.data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load profile:", error)
      router.push("/login")
    }
  }

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user?.email[0].toUpperCase() || 'U'
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/resident/avatar', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      })

      const data = await res.json()
      if (data.success) {
        alert('Avatar updated successfully!')
        // Update avatar immediately
        setUser({ ...user, avatar_url: data.data.avatar_url })
      } else {
        alert(data.error || 'Failed to upload avatar')
      }
    } catch (error) {
      alert('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ResidentHeader user={user} profile={{ role: 'resident', full_name: '' }} />
        <main className="container mx-auto px-4 py-6">
          <div className="p-6">Loading...</div>
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <ResidentHeader user={user} profile={{ role: user.role, full_name: user.full_name || '' }} />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-6">
          
          {/* Header Card with Profile Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <CardTitle className="text-2xl md:text-3xl">{user.full_name || "No Name Set"}</CardTitle>
                  <CardDescription className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />
                      RESIDENT
                    </Badge>
                    {user.is_verified ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={user.full_name || ""} 
                    readOnly 
                    className="bg-muted" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user.email || ""} 
                    readOnly 
                    className="bg-muted" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KYC Verification Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Verification (KYC)
              </CardTitle>
              <CardDescription>
                Complete your identity verification to access all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Verification Status</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    KYC Status: <span className="font-medium">{user.kyc_status || "Not started"}</span>
                  </p>
                  {user.kyc_submitted_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {new Date(user.kyc_submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge variant={user.is_verified ? "default" : "outline"} className="text-sm">
                  {user.is_verified ? "Verified" : 
                   user.kyc_status === "pending" ? "Pending Review" : 
                   "Not Verified"}
                </Badge>
              </div>
              
              {!user.is_verified && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Required Documents:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Valid Government ID (Front & Back)</li>
                    <li>Recent Selfie Photo</li>
                    <li>Proof of Residence (Optional)</li>
                  </ul>
                  <Button 
                    className="w-full mt-4" 
                    variant={user.kyc_status === "pending" ? "outline" : "default"}
                    onClick={() => window.location.href = '/kyc'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {user.kyc_status === "pending" ? "Resubmit Documents" : "Start Verification"}
                  </Button>
                </div>
              )}

              {user.is_verified && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-900">Account Verified!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        You now have full access to all barangay services
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {user.kyc_notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Admin Notes:</h4>
                  <p className="text-sm text-yellow-800">{user.kyc_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Password</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last changed: Never
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
