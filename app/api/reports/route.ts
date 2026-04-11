import { type NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { getCorsHeaders, handleOptions } from "@/lib/cors"

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
    let query = "SELECT * FROM reports"
    let params: any[] = []
    
    if (session.role !== 'admin') {
      query += " WHERE user_id = ?"
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
        reporterName: r.reporter_name,
        reporterContact: r.reporter_contact,
        status: r.status,
        response: r.response,
        images: r.image_url ? [r.image_url] : [],
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

    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      type = (formData.get("type") as string) || "other"
      title = (formData.get("title") as string) || ""
      description = (formData.get("description") as string) || ""
      location = (formData.get("location") as string) || ""
      reporterName = (formData.get("reporterName") as string) || "Anonymous"
      reporterContact = (formData.get("reporterContact") as string) || ""

      const file = formData.get("image") as File | null
      if (file && file.size > 0 && file.size < 2_000_000) {
        const buf = Buffer.from(await file.arrayBuffer())
        imageData = `data:${file.type};base64,${buf.toString("base64")}`
      }
    } else {
      const body = await request.json()
      type = body.type || "other"
      title = body.title || ""
      description = body.description || ""
      location = body.location || ""
      reporterName = body.reporterName || "Anonymous"
      reporterContact = body.reporterContact || ""
    }

    if (!title.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400, headers })
    }

    const result = await execute(
      "INSERT INTO reports (user_id, type, title, description, location, reporter_name, reporter_contact, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
      [session.sub, type, title, description, location, reporterName, reporterContact, imageData]
    )

    return NextResponse.json({
      success: true,
      data: {
        id: String(result.insertId),
        type, title, description, location,
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
