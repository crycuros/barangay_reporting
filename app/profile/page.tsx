"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Shield, 
  Settings, 
  Bell, 
  HelpCircle, 
  Info,
  LogOut,
  Upload,
  CheckCircle,
  AlertTriangle,
  Camera
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  is_verified: boolean
  kyc_status: string
  phone?: string
  address?: string
  zone?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'include' })
      const data = await response.json()
      
      if (data.success && data.user) {
        setUser(data.user)
        setProfile(data.profile)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        
        const response = await fetch('/api/resident/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ base64 }),
        })

        const data = await response.json()
        
        if (data.success) {
          await loadProfile()
          alert('Profile picture updated!')
        } else {
          alert('Failed to upload avatar')
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      alert('Error uploading avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Verification Banner */}
      {!user.is_verified && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Account not verified – limited features</p>
                <p className="text-sm text-yellow-700">Verify your identity to unlock full access including report submission.</p>
              </div>
            </div>
            <Button 
              onClick={() => router.push('/kyc')}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Verify Identity
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-blue-500">
                    {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-2 border-white cursor-pointer hover:bg-blue-700 transition-colors">
                  {isUploadingAvatar ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{user.full_name || 'User'}</h1>
                <p className="text-blue-100">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white text-blue-700">
                    {user.role.toUpperCase()}
                  </Badge>
                  {user.is_verified && (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            {profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{profile.phone}</span>
                    </div>
                  )}
                  {profile.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium">{profile.address}</span>
                    </div>
                  )}
                  {profile.zone && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Zone:</span>
                      <span className="font-medium">{profile.zone}</span>
                    </div>
                  )}
                  <Separator />
                  <Button variant="outline" className="w-full">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* KYC Verification */}
            {user.role !== 'admin' && (
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
                      <p className="text-sm text-gray-600 mt-1">
                        KYC Status: <span className="font-medium">{user.kyc_status || 'Not started'}</span>
                      </p>
                    </div>
                    <Badge variant={user.is_verified ? 'default' : 'outline'}>
                      {user.is_verified ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </>
                      ) : user.kyc_status === 'pending' ? (
                        '⏳ Pending Review'
                      ) : (
                        'Not Verified'
                      )}
                    </Badge>
                  </div>

                  {!user.is_verified && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold mb-2">Required Documents:</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>Valid Government ID (Front & Back)</li>
                        <li>Recent Selfie Photo</li>
                        <li>Proof of Residence (Optional)</li>
                      </ul>
                      <Button 
                        className="w-full mt-4" 
                        variant={user.kyc_status === 'pending' ? 'outline' : 'default'}
                        onClick={() => router.push('/kyc')}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {user.kyc_status === 'pending' ? 'Resubmit Documents' : 'Start Verification'}
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Menu */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Menu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help & Support
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Info className="h-4 w-4 mr-2" />
                  About
                </Button>
                <Separator className="my-2" />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
