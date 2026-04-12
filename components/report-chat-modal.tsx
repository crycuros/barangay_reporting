"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Loader2, MapPin, User, Phone, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Separator } from "@/components/ui/separator"

interface Message {
  id: string
  report_id: string
  user_id: string | null
  user_name: string
  user_role: string | null
  message: string
  is_system_message: boolean
  created_at: string
}

interface Report {
  id: string
  title: string
  status: string
  type: string
  description?: string
  location?: string
  reporterName?: string
  reporterContact?: string
  createdAt?: string
}

interface ReportChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: Report
  currentUserRole: string
}

export function ReportChatModal({ open, onOpenChange, report, currentUserRole }: ReportChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(report.status)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isEmergencyReport = report.type === "crime" || report.type === "missing-person" || report.type === "missing_person"

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/reports/${report.id}/messages`, {
        credentials: "same-origin"
      })
      const data = await res.json()
      if (data.success) {
        setMessages(data.data)
        // Auto-scroll to bottom
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 100)
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: newMessage.trim() })
      })

      if (res.ok) {
        setNewMessage("")
        await fetchMessages()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  // Update status
  const updateStatus = async (newStatus: string) => {
    if (newStatus === currentStatus) return

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        setCurrentStatus(newStatus)
        await fetchMessages() // Refresh to show system message
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Start polling when modal opens
  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchMessages().finally(() => setLoading(false))
      
      // Poll every 5 seconds
      pollIntervalRef.current = setInterval(fetchMessages, 5000)
    } else {
      // Stop polling when modal closes
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [open, report.id])

  const getMessageAlignment = (msg: Message) => {
    if (msg.is_system_message) return "center"
    if (currentUserRole === "admin") {
      return msg.user_role === "admin" ? "right" : "left"
    } else {
      return msg.user_role === "admin" ? "left" : "right"
    }
  }

  const getMessageBgColor = (msg: Message) => {
    if (msg.is_system_message) return "bg-gray-100 text-gray-700"
    if (currentUserRole === "admin") {
      return msg.user_role === "admin" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
    } else {
      return msg.user_role === "admin" ? "bg-gray-200 text-gray-900" : "bg-blue-500 text-white"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[700px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{report.title}</span>
            <Badge variant={
              currentStatus === 'resolved' && isEmergencyReport ? 'destructive' :
              currentStatus === 'resolved' ? 'secondary' :
              currentStatus === 'in-progress' ? 'default' :
              currentStatus === 'pending' ? 'destructive' : 'outline'
            }>
              {currentStatus}
            </Badge>
            <Badge variant="outline">{report.type}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Report Details */}
        <div className="px-1 py-2 bg-muted/50 rounded-lg space-y-2 text-sm">
          {report.description && (
            <p className="text-sm">{report.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {report.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {report.location}
              </div>
            )}
            {report.reporterName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {report.reporterName}
              </div>
            )}
            {report.reporterContact && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {report.reporterContact}
              </div>
            )}
            {report.createdAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(report.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Status Changer for Admin/Official */}
        {(currentUserRole === "admin" || currentUserRole === "official") && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium">Change Status:</span>
            <Select value={currentStatus} onValueChange={updateStatus} disabled={updatingStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isEmergencyReport && <SelectItem value="pending">Pending</SelectItem>}
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        )}

        <Separator />

        {/* Messages Area */}
        <ScrollArea className="flex-1 min-h-0 pr-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    getMessageAlignment(msg) === "right" ? "justify-end" :
                    getMessageAlignment(msg) === "center" ? "justify-center" :
                    "justify-start"
                  }`}
                >
                  <div className={`max-w-[70%] ${getMessageAlignment(msg) === "center" ? "text-center" : ""}`}>
                    {!msg.is_system_message && getMessageAlignment(msg) === "left" && (
                      <div className="text-xs text-gray-500 mb-1">{msg.user_name}</div>
                    )}
                    <div className={`rounded-lg px-4 py-2 ${getMessageBgColor(msg)} ${
                      msg.is_system_message ? "text-sm italic" : ""
                    }`}>
                      {msg.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t pt-4 flex gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
