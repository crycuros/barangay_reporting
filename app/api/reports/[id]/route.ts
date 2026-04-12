import { type NextRequest, NextResponse } from "next/server"
import { execute, queryOne } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { getCorsHeaders, handleOptions } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return handleOptions(origin)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    console.log("Report PATCH - session:", session?.sub, session?.role)
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      console.log("Unauthorized - role:", session?.role)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { id } = await params
    const body = await request.json()
    console.log("Report PATCH - updating report:", id, "status:", body.status)

    // Get current report status for comparison
    const currentReport = await queryOne<{ status: string }>(
      "SELECT status FROM reports WHERE id = ?",
      [id]
    )

    const fields: string[] = []
    const values: any[] = []
    
    // Track if status changed
    let statusChanged = false
    let oldStatus = ""
    let newStatus = ""

    if (body.status !== undefined) { 
      const newStatusValue = body.status
      const currentReportWithType = await queryOne<{ status: string; type: string }>(
        "SELECT status, type FROM reports WHERE id = ?",
        [id]
      )
      const reportType = currentReportWithType?.type || ""
      const isEmergencyType = ["crime", "missing_person", "missing-person"].includes(reportType)
      
      fields.push("status = ?"); 
      values.push(newStatusValue);
      if (currentReport && currentReport.status !== newStatusValue) {
        statusChanged = true
        oldStatus = currentReport.status
        newStatus = newStatusValue
      }
    }
    if (body.response !== undefined) { fields.push("response = ?"); values.push(body.response) }

    if (body.imageBase64) {
      fields.push("image_url = ?")
      values.push(body.imageBase64)
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: "No fields" }, { status: 400, headers })
    }

    values.push(id)
    await execute(`UPDATE reports SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values)

    // Create system message for status change
    if (statusChanged) {
      const statusLabels: Record<string, string> = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'resolved': 'Resolved',
        'closed': 'Closed'
      }
      const systemMessage = `Status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus]}`
      
      await execute(
        `INSERT INTO report_messages (report_id, user_id, message, is_system_message) 
         VALUES (?, NULL, ?, TRUE)`,
        [id, systemMessage]
      )

      // Mark as unread for resident
      await execute(
        "UPDATE reports SET last_message_at = NOW(), unread_by_resident = TRUE WHERE id = ?",
        [id]
      )
    }

    // Create message for admin response
    if (body.response) {
      await execute(
        `INSERT INTO report_messages (report_id, user_id, message, is_system_message) 
         VALUES (?, ?, ?, FALSE)`,
        [id, session.userId, body.response]
      )

      // Mark as unread for resident
      await execute(
        "UPDATE reports SET last_message_at = NOW(), unread_by_resident = TRUE WHERE id = ?",
        [id]
      )
    }

    const updated = await queryOne<any>("SELECT * FROM reports WHERE id = ?", [id])
    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404, headers })

    return NextResponse.json({
      success: true,
      data: {
        id: String(updated.id),
        type: updated.type,
        title: updated.title,
        description: updated.description,
        location: updated.location,
        reporterName: updated.reporter_name,
        reporterContact: updated.reporter_contact,
        status: updated.status,
        response: updated.response,
        images: updated.image_url ? [updated.image_url] : [],
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    }, { headers })
  } catch (e) {
    console.error("Reports PATCH error:", e)
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500, headers })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { id } = await params
    await execute("DELETE FROM reports WHERE id = ?", [id])
    return NextResponse.json({ success: true, message: "Deleted" }, { headers })
  } catch (e) {
    console.error("Reports DELETE error:", e)
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500, headers })
  }
}
