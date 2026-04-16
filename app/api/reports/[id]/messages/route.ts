import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute, queryAll } from "@/lib/db"
import { getCorsHeaders, handleOptions } from "@/lib/cors"
import { publishEvent } from "@/lib/server/realtime"

async function ensureReportMessagesTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS report_messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      report_id INT NOT NULL,
      user_id INT NULL,
      message TEXT NOT NULL,
      image_url TEXT NULL,
      is_system_message BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_report_id (report_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    []
  )
  // Add image_url if missing (for existing tables)
  await execute("ALTER TABLE report_messages ADD COLUMN IF NOT EXISTS image_url TEXT NULL", []).catch(() => {})
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return handleOptions(origin)
}

// GET all messages for a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    await ensureReportMessagesTable()
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { id: reportId } = await params

    // Get all messages for this report with user info
    const messages = await queryAll<{
      id: number
      report_id: number
      user_id: number | null
      message: string
      is_system_message: boolean
      created_at: string
      user_name: string | null
      user_role: string | null
      user_email: string | null
    }>(
      `SELECT 
        rm.id, 
        rm.report_id, 
        rm.user_id, 
        rm.message,
        rm.image_url,
        rm.is_system_message, 
        rm.created_at,
        u.full_name as user_name,
        u.role as user_role,
        u.email as user_email
      FROM report_messages rm
      LEFT JOIN users u ON rm.user_id = u.id
      WHERE rm.report_id = ?
      ORDER BY rm.created_at ASC`,
      [reportId]
    )

    // Mark messages as read based on user role
    if (session.role === 'admin' || session.role === 'official') {
      await execute(
        "UPDATE reports SET unread_by_admin = FALSE WHERE id = ?",
        [reportId]
      )
    } else {
      await execute(
        "UPDATE reports SET unread_by_resident = FALSE WHERE id = ?",
        [reportId]
      )
    }

    return NextResponse.json({
      success: true,
      data: messages.map(m => ({
        id: String(m.id),
        report_id: String(m.report_id),
        user_id: m.user_id ? String(m.user_id) : null,
        user_name: m.user_name || 'System',
        user_role: m.user_role,
        user_email: m.user_email,
        message: m.message,
        image_url: (m as any).image_url || null,
        is_system_message: Boolean(m.is_system_message),
        created_at: m.created_at,
      })),
    }, { headers })
  } catch (e) {
    console.error("Get messages error:", e)
    return NextResponse.json({ success: false, error: "Failed to get messages" }, { status: 500, headers })
  }
}

// POST a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    await ensureReportMessagesTable()
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { id: reportId } = await params
    const body = await request.json()
    const { message, imageUrl } = body

    if ((!message || typeof message !== 'string' || message.trim().length === 0) && !imageUrl) {
      return NextResponse.json({ success: false, error: "Message or image is required" }, { status: 400, headers })
    }

    // Insert message
    await execute(
      `INSERT INTO report_messages (report_id, user_id, message, image_url, is_system_message) 
       VALUES (?, ?, ?, ?, FALSE)`,
      [reportId, session.sub ?? null, (message || "").trim(), imageUrl || null]
    )

    // Update report's last_message_at and unread flags
    if (session.role === 'admin' || session.role === 'official') {
      // Admin sent message, mark as unread for resident
      await execute(
        `UPDATE reports 
         SET last_message_at = NOW(), unread_by_resident = TRUE 
         WHERE id = ?`,
        [reportId]
      )
    } else {
      // Resident sent message, mark as unread for admin
      await execute(
        `UPDATE reports 
         SET last_message_at = NOW(), unread_by_admin = TRUE 
         WHERE id = ?`,
        [reportId]
      )
    }

    publishEvent("reports.updated", {
      action: "message_sent",
      id: String(reportId),
      senderRole: session.role,
      preview: imageUrl && !message ? "Sent a photo" : (message || "").trim().slice(0, 80),
    })

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    console.error("Send message error:", e)
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500, headers })
  }
}
