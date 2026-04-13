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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { connectRealtimeEvents } from "@/lib/client/sse"

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const scrollAreaContainerRef = useRef<HTMLDivElement>(null)

  const isEmergencyReport = ["crime", "missing-person", "missing_person", "fire", "medical", "disaster", "assault", "robbery", "hazard"].includes(report.type)
  const isFinalStatus = currentStatus === "closed"

  const scrollToBottom = () => {
    const viewport = scrollAreaContainerRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/reports/${report.id}/messages`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      const data = await res.json()
      if (data.success) {
        setMessages(data.data)
        setTimeout(scrollToBottom, 50)
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    const messageToSend = newMessage.trim()
    try {
      const res = await fetch(`/api/reports/${report.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: messageToSend })
      })

      if (res.ok) {
        setNewMessage("")
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || "Failed to send message")
      }
      await fetchMessages()
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  // Update status
  const updateStatus = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    if (isFinalStatus) return

    if (newStatus === "resolved" || newStatus === "closed") {
      setPendingStatus(newStatus)
      setConfirmOpen(true)
      return
    }

    await executeStatusUpdate(newStatus)
  }

  const executeStatusUpdate = async (newStatus: string) => {
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

  useEffect(() => {
    setCurrentStatus(report.status)
  }, [report.id, report.status])

  // Initial fetch when modal opens
  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchMessages().finally(() => setLoading(false))
    }
  }, [open, report.id])

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 50)
    }
  }, [messages, open])

  // Live updates via SSE
  useEffect(() => {
    if (!open) return
    const cleanup = connectRealtimeEvents({
      onUpdate: (parsed) => {
        if (parsed?.type !== "reports.updated") return
        const targetId = String(parsed?.payload?.id ?? parsed?.id ?? "")
        if (targetId && targetId === String(report.id)) {
          fetchMessages()
        }
      },
    })
    return cleanup
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
              currentStatus === 'resolved' || currentStatus === 'closed' ? 'secondary' :
              currentStatus === 'in-progress' ? 'default' :
              currentStatus === 'pending' ? (isEmergencyReport ? 'destructive' : 'outline') : 'outline'
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
            <Select value={currentStatus} onValueChange={updateStatus} disabled={updatingStatus || isFinalStatus}>
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
            {isFinalStatus && (
              <span className="text-xs text-muted-foreground">
                Locked after {currentStatus}
              </span>
            )}
          </div>
        )}

        <Separator />

        {/* Messages Area */}
        <div ref={scrollAreaContainerRef} className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
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
        </div>

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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm mark as {pendingStatus}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will lock the report status and prevent further status changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingStatus) return
                const target = pendingStatus
                setPendingStatus(null)
                await executeStatusUpdate(target)
              }}
            >
              Yes, confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
