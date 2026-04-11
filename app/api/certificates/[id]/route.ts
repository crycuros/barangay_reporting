import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const action = body.action
    const notes = typeof body.notes === "string" ? body.notes.trim() : null

    if (action === "approve") {
      await execute(
        "UPDATE certificate_requests SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes, session.sub, id]
      )
    } else if (action === "reject") {
      await execute(
        "UPDATE certificate_requests SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes, session.sub, id]
      )
    } else if (action === "ready") {
      await execute(
        "UPDATE certificate_requests SET status = 'ready', admin_notes = ?, processed_by = ?, processed_at = NOW() WHERE id = ?",
        [notes || "Ready for pickup", session.sub, id]
      )
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Certificate action error:", e)
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 })
  }
}
