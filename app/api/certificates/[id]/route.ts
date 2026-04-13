import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute, queryOne } from "@/lib/db"
import { publishEvent } from "@/lib/server/realtime"

async function ensureCertificateRequestsTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS certificate_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      purpose TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      admin_notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME DEFAULT NULL,
      processed_by INT DEFAULT NULL
    )`,
    []
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCertificateRequestsTable()
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const action = body.action
    const notes = typeof body.notes === "string" ? body.notes.trim() : null
    const existing = await queryOne<{ status: string }>("SELECT status FROM certificate_requests WHERE id = ?", [id])
    if (!existing) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 })
    }

    const currentStatus = String(existing.status || "").toLowerCase()

    if (action === "approve") {
      if (currentStatus !== "pending") {
        return NextResponse.json({ success: false, error: "Only pending requests can be approved" }, { status: 409 })
      }
      await execute(
        "UPDATE certificate_requests SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes, session.sub, id]
      )
    } else if (action === "reject") {
      if (currentStatus !== "pending") {
        return NextResponse.json({ success: false, error: "Only pending requests can be rejected" }, { status: 409 })
      }
      if (!notes) {
        return NextResponse.json({ success: false, error: "Rejection note is required" }, { status: 400 })
      }
      await execute(
        "UPDATE certificate_requests SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes, session.sub, id]
      )
    } else if (action === "ready") {
      if (currentStatus !== "approved") {
        return NextResponse.json({ success: false, error: "Only approved requests can be marked ready" }, { status: 409 })
      }
      await execute(
        "UPDATE certificate_requests SET status = 'ready', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes || "Ready for pickup", session.sub, id]
      )
    } else if (action === "picked_up") {
      if (currentStatus !== "ready") {
        return NextResponse.json({ success: false, error: "Only ready requests can be marked picked up" }, { status: 409 })
      }
      await execute(
        "UPDATE certificate_requests SET status = 'picked_up', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes || "Picked up by resident", session.sub, id]
      )
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    publishEvent("certificates.updated", { action, id: String(id) })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Certificate action error:", e)
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 })
  }
}
