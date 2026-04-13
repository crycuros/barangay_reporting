import { type NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    const isAdminView = session && (session.role === "admin" || session.role === "super_admin")

    const rows = await queryAll<{
      id: number
      email: string
      full_name: string | null
      role: string
      avatar_url: string | null
      is_verified: number
      approval_status: string | null
      kyc_status: string | null
      department: string | null
      created_at: string
    }>(
      `SELECT 
         u.id, u.email, u.full_name, u.role, u.avatar_url, u.is_verified, u.approval_status, u.kyc_status, u.created_at,
         o.department
       FROM users u
       LEFT JOIN officials o ON o.email = u.email
       WHERE u.role = 'official'
       ORDER BY u.created_at DESC`,
      []
    )

    const filtered = isAdminView
      ? rows
      : rows.filter((r) => Boolean(r.is_verified) && (r.approval_status === "approved" || r.approval_status === null))

    return NextResponse.json({
      success: true,
      data: filtered.map(r => ({
        id: String(r.id),
        name: r.full_name || r.email,
        position: "Barangay Official",
        contact: "",
        email: r.email,
        photo: r.avatar_url,
        department: r.department || "Barangay Office",
        isActive: Boolean(r.is_verified),
        isVerified: Boolean(r.is_verified),
        approvalStatus: r.approval_status || "pending",
        kycStatus: r.kyc_status || "none",
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
    return NextResponse.json(
      { success: false, error: "Manual add is disabled. Officials are created from approved registrations." },
      { status: 405 }
    )
  } catch (e) {
    console.error("Officials POST error:", e)
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 })
  }
}
