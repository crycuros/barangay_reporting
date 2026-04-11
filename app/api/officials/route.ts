import { type NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"

export async function GET() {
  try {
    const rows = await queryAll<{
      id: number; name: string; position: string; contact: string; email: string;
      photo: string | null; department: string; is_active: number; created_at: string
    }>("SELECT * FROM officials ORDER BY created_at DESC", [])

    return NextResponse.json({
      success: true,
      data: rows.map(r => ({
        id: String(r.id),
        name: r.name,
        position: r.position,
        contact: r.contact,
        email: r.email,
        photo: r.photo,
        department: r.department,
        isActive: Boolean(r.is_active),
        created_at: r.created_at,
      })),
    })
  } catch (e) {
    console.error("Officials GET error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = await execute(
      "INSERT INTO officials (name, position, contact, email, department) VALUES (?, ?, ?, ?, ?)",
      [body.name, body.position, body.contact || "", body.email || "", body.department || ""]
    )

    return NextResponse.json({
      success: true,
      data: { id: String(result.insertId), ...body },
    })
  } catch (e) {
    console.error("Officials POST error:", e)
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 })
  }
}
