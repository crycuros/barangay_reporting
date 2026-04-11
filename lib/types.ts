export type AnnouncementType = "general" | "emergency" | "event" | "maintenance"
export type ReportType = "crime" | "waste" | "missing-person" | "infrastructure" | "other"
export type ReportStatus = "pending" | "in-progress" | "resolved" | "closed"

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  priority: "low" | "medium" | "high" | "urgent"
  createdAt: string
  updatedAt: string
  author: string
  isActive: boolean
  status: "active" | "resolved"
  imageUrl?: string | null
  likes?: number
  location?: string | null
}

export interface Report {
  id: string
  type: ReportType
  title: string
  description: string
  location: string
  reporterName: string
  reporterContact: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  response?: string
  images?: string[]
}

export interface Official {
  id: string
  name: string
  position: string
  contact: string
  email: string
  photo?: string
  department: string
  isActive: boolean
}
