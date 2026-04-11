import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryAll } from "@/lib/db"
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
    if (session.role !== "admin" && session.role !== "official") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403, headers })
    }

    const rows = await queryAll<{
      id: number
      email: string
      full_name: string | null
      role: string
      avatar_url: string | null
      kyc_status: string | null
      kyc_id_image: string | null
      kyc_notes: string | null
      kyc_submitted_at: string | null
      is_verified: number
    }>(
      `SELECT id, email, full_name, role, avatar_url, kyc_status, kyc_id_image, kyc_notes, kyc_submitted_at, COALESCE(is_verified, 0) as is_verified
       FROM users
       WHERE role = 'resident' AND (kyc_status = 'pending' OR COALESCE(is_verified, 0) = 0)
       ORDER BY kyc_submitted_at DESC`
    )

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        user_id: String(r.id),
        user_name: r.full_name || r.email,
        user_email: r.email,
        status: r.kyc_status || "pending",
        kyc_id_image: r.kyc_id_image,
        kyc_notes: r.kyc_notes,
        submitted_at: r.kyc_submitted_at,
        is_verified: Boolean(r.is_verified),
      })),
    }, { headers })
  } catch (e) {
    console.error("Verifications fetch error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500, headers })
  }
}
