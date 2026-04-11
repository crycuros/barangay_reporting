"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Mail, 
  Shield, 
  Camera,
  Building,
  Phone
} from 'lucide-react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

export default function AdminProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [fullName, setFullName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'include' })
      const data = await response.json()
      
      if (data.success && data.data) {
        setUser(data.data)
        setFullName(data.data.full_name || '')
      } else {
        router.push('/admin-login')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      router.push('/admin-login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    setIsUploadingAvatar(true)
    try {
      // Create base64 with image compression
      const createBase64 = async () => {
        const img = document.createElement('img')
        const reader = new FileReader()
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })
        
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.src = dataUrl
        })
        
        const canvas = document.createElement('canvas')
        const maxSize = 256
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = Math.max(1, Math.floor(img.width * ratio))
        canvas.height = Math.max(1, Math.floor(img.height * ratio))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get canvas context')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        let quality = 0.8
        let out = canvas.toDataURL('image/jpeg', quality)
        while (out.length > 58000 && quality > 0.4) {
          quality -= 0.1
          out = canvas.toDataURL('image/jpeg', quality)
        }
        return out
      }
      
      const base64 = await createBase64()
      const formData = new FormData()
      formData.append('base64', base64)
      
      const response = await fetch('/api/admin/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      
      if (data.success) {
        await loadProfile()
        alert('Profile picture updated successfully!')
      } else {
        alert(data.error || 'Failed to upload avatar')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('Error uploading avatar. Please try again.')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUpdateName = async () => {
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name: fullName }),
      })

      const data = await response.json()
      
      if (data.success) {
        await loadProfile()
        setIsEditingName(false)
        alert('Name updated successfully!')
      } else {
        alert(data.error || 'Failed to update name')
      }
    } catch (error) {
      console.error('Update name error:', error)
      alert('Error updating name. Please try again.')
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name?.trim()) {
      return name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-600">Administrator</Badge>
      case 'official':
        return <Badge className="bg-blue-600">Barangay Official</Badge>
      default:
        return <Badge>{role}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 ml-64">
          <AdminHeader />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground mt-1">
                Manage your account information and preferences
              </p>
            </div>

            {/* Profile Picture Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Update your profile photo. Recommended size: 256x256px
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name || user.email} />
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                      {getInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarUpload}
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 1.5MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Your account details and role information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                      <Button onClick={handleUpdateName}>Save</Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setFullName(user.full_name || '')
                          setIsEditingName(false)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={user.full_name || 'Not set'}
                        disabled
                      />
                      <Button variant="outline" onClick={() => setIsEditingName(true)}>
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </Label>
                  <div>
                    {getRoleBadge(user.role)}
                  </div>
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    User ID
                  </Label>
                  <Input
                    value={user.id}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
