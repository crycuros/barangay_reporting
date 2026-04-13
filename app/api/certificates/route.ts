import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryAll, execute, queryOne } from "@/lib/db"
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

export async function GET(request: NextRequest) {
  try {
    await ensureCertificateRequestsTable()
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
    await ensureCertificateRequestsTable()
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== "resident") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const type = typeof body.type === "string" ? body.type.trim() : ""
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : ""

    const validTypes = ["barangay-clearance", "residency", "indigency", "business-permit", "cedula"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid certificate type" }, { status: 400 })
    }
    if (!purpose) {
      return NextResponse.json({ success: false, error: "Purpose is required" }, { status: 400 })
    }

    let existing: { id: number } | null = null
    try {
      existing = await queryOne<{ id: number }>(
        "SELECT id FROM certificate_requests WHERE user_id = ? AND type = ? AND status IN ('pending', 'approved') LIMIT 1",
        [session.sub, type]
      )
    } catch (checkErr) {
      console.error("Certificates duplicate-check warning:", checkErr)
      // Do not block request on duplicate-check query issues.
      existing = null
    }
    if (existing) {
      return NextResponse.json(
        { success: false, error: "You already have an active request for this certificate type." },
        { status: 409 }
      )
    }

    const result = await execute(
      "INSERT INTO certificate_requests (user_id, type, purpose) VALUES (?, ?, ?)",
      [session.sub, type, purpose]
    )
    publishEvent("certificates.updated", { action: "created", id: String(result.insertId) })

    return NextResponse.json({
      success: true,
      data: { id: String(result.insertId), type, purpose, status: "pending" },
    })
  } catch (e) {
    console.error("Certificates POST error:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: `Failed to create: ${errorMessage}` }, { status: 500 })
  }
}
