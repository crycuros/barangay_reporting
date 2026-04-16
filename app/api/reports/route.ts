import { type NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { getCorsHeaders, handleOptions } from "@/lib/cors"
import { publishEvent } from "@/lib/server/realtime"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

// Auto-add lat/lng columns once per server process
const g = globalThis as typeof globalThis & { __reportsMigrated?: boolean }
if (!g.__reportsMigrated) {
  g.__reportsMigrated = true
  Promise.all([
    execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL", []),
    execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL", []),
  ]).catch(() => {/* columns may already exist */})
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return handleOptions(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    // If user is admin, fetch all reports, otherwise fetch only user's reports
    let query = `SELECT 
      r.*,
      (
        SELECT COUNT(*)
        FROM report_messages rm
        LEFT JOIN users u ON u.id = rm.user_id
        WHERE rm.report_id = r.id
          AND rm.is_system_message = FALSE
          AND u.role IN ('admin', 'official')
          AND rm.created_at > COALESCE(
            (
              SELECT MAX(rm2.created_at)
              FROM report_messages rm2
              LEFT JOIN users u2 ON u2.id = rm2.user_id
              WHERE rm2.report_id = r.id
                AND rm2.is_system_message = FALSE
                AND u2.role = 'resident'
            ),
            '1970-01-01 00:00:00'
          )
      ) AS unread_resident_count
      ,
      (
        SELECT COUNT(*)
        FROM report_messages rm
        LEFT JOIN users u ON u.id = rm.user_id
        WHERE rm.report_id = r.id
          AND rm.is_system_message = FALSE
          AND u.role = 'resident'
          AND rm.created_at > COALESCE(
            (
              SELECT MAX(rm2.created_at)
              FROM report_messages rm2
              LEFT JOIN users u2 ON u2.id = rm2.user_id
              WHERE rm2.report_id = r.id
                AND rm2.is_system_message = FALSE
                AND u2.role IN ('admin', 'official')
            ),
            '1970-01-01 00:00:00'
          )
      ) AS unread_admin_count
    FROM reports r`
    let params: any[] = []
    
    if (session.role !== 'admin') {
      query += " WHERE r.user_id = ?"
      params.push(session.sub) // session.sub is the user ID
    }
    
    query += " ORDER BY created_at DESC"

    const rows = await queryAll<{
      id: number; type: string; title: string; description: string; location: string;
      reporter_name: string; reporter_contact: string; status: string; response: string | null;
      image_url: string | null; created_at: string; updated_at: string; user_id: number | null
    }>(query, params)

    return NextResponse.json({
      success: true,
      data: rows.map(r => ({
        id: String(r.id),
        type: r.type,
        title: r.title,
        description: r.description,
        location: r.location,
        latitude: (r as any).latitude ? Number((r as any).latitude) : null,
        longitude: (r as any).longitude ? Number((r as any).longitude) : null,
        reporterName: r.reporter_name,
        reporterContact: r.reporter_contact,
        status: r.status,
        response: r.response,
        images: r.image_url ? [r.image_url] : [],
        unreadByAdmin: Boolean((r as any).unread_by_admin),
        unreadByResident: Boolean((r as any).unread_by_resident),
        unreadReplyCount: Number((r as any).unread_resident_count) || 0,
        unreadAdminReplyCount: Number((r as any).unread_admin_count) || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    }, { headers })
  } catch (e) {
    console.error("Reports GET error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    let type = "", title = "", description = "", location = "", reporterName = "", reporterContact = ""
    let imageData: string | null = null
    let status = "pending"
    let latitude: number | null = null
    let longitude: number | null = null

    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      type = (formData.get("type") as string) || "other"
      title = (formData.get("title") as string) || ""
      description = (formData.get("description") as string) || ""
      location = (formData.get("location") as string) || ""
      reporterName = (formData.get("reporterName") as string) || "Anonymous"
      reporterContact = (formData.get("reporterContact") as string) || ""
      const latVal = formData.get("latitude") as string | null
      const lngVal = formData.get("longitude") as string | null
      if (latVal && lngVal) {
        latitude = parseFloat(latVal)
        longitude = parseFloat(lngVal)
      }

      const file = formData.get("image") as File | null
      if (file && file.size > 0 && file.size <= 2_000_000) {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        if (allowedTypes.includes(file.type)) {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "reports", String(session.sub))
          if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })
          const ext = file.name.split(".").pop() || "jpg"
          const fileName = `report_${Date.now()}.${ext}`
          const filePath = path.join(uploadDir, fileName)
          await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
          imageData = `/uploads/reports/${session.sub}/${fileName}`
        }
      }
    } else {
      const body = await request.json()
      type = body.type || "other"
      title = body.title || ""
      description = body.description || ""
      location = body.location || ""
      reporterName = body.reporterName || "Anonymous"
      reporterContact = body.reporterContact || ""
      latitude = body.latitude != null ? Number(body.latitude) : null
      longitude = body.longitude != null ? Number(body.longitude) : null
    }

    const isEmergencyType = type === "crime" || type === "missing_person"
    const isPendingType = isEmergencyType || type === "other"
    status = isPendingType ? "pending" : "in-progress"

    if (!title.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400, headers })
    }

    const result = await execute(
      "INSERT INTO reports (user_id, type, title, description, location, latitude, longitude, reporter_name, reporter_contact, status, image_url, unread_by_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [session.sub, type, title, description, location, latitude, longitude, reporterName, reporterContact, status, imageData, 1]
    )
    publishEvent("reports.updated", { action: "created", id: String(result.insertId) })

    return NextResponse.json({
      success: true,
      data: {
        id: String(result.insertId),
        type, title, description, location, latitude, longitude,
        reporterName, reporterContact,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    }, { headers })
  } catch (e) {
    console.error("Reports POST error:", e)
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500, headers })
  }
}
