import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryAll, execute } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    if (session.role === "admin" || session.role === "official") {
      const rows = await queryAll<any>(
        `SELECT cr.*, u.full_name, u.email, u.avatar_url
         FROM certificate_requests cr
         JOIN users u ON u.id = cr.user_id
         ORDER BY cr.created_at DESC`, []
      )
      return NextResponse.json({
        success: true,
        data: rows.map((r: any) => ({
          id: String(r.id),
          userId: String(r.user_id),
          type: r.type,
          purpose: r.purpose,
          status: r.status,
          adminNotes: r.admin_notes,
          createdAt: r.created_at,
          processedAt: r.processed_at,
          fullName: r.full_name,
          email: r.email,
          avatarUrl: r.avatar_url,
        })),
      })
    }

    const rows = await queryAll<any>(
      "SELECT * FROM certificate_requests WHERE user_id = ? ORDER BY created_at DESC",
      [session.sub]
    )
    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        id: String(r.id),
        type: r.type,
        purpose: r.purpose,
        status: r.status,
        adminNotes: r.admin_notes,
        createdAt: r.created_at,
        processedAt: r.processed_at,
      })),
    })
  } catch (e) {
    console.error("Certificates GET error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== "resident") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const type = body.type || ""
    const purpose = body.purpose || ""

    const validTypes = ["barangay-clearance", "residency", "indigency", "business-permit", "cedula"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid certificate type" }, { status: 400 })
    }
    if (!purpose.trim()) {
      return NextResponse.json({ success: false, error: "Purpose is required" }, { status: 400 })
    }

    const result = await execute(
      "INSERT INTO certificate_requests (user_id, type, purpose) VALUES (?, ?, ?)",
      [session.sub, type, purpose]
    )

    return NextResponse.json({
      success: true,
      data: { id: String(result.insertId), type, purpose, status: "pending" },
    })
  } catch (e) {
    console.error("Certificates POST error:", e)
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 })
  }
}
