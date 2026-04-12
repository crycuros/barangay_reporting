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
      is_verified: number
      kyc_id: number | null
      kyc_full_name: string | null
      kyc_phone: string | null
      kyc_date_of_birth: string | null
      kyc_gender: string | null
      kyc_address_line1: string | null
      kyc_barangay: string | null
      kyc_city: string | null
      kyc_province: string | null
      kyc_id_type: string | null
      kyc_id_number: string | null
      kyc_id_front_url: string | null
      kyc_id_back_url: string | null
      kyc_selfie_url: string | null
      kyc_notes: string | null
      kyc_submitted_at: string | null
      kyc_status: string | null
    }>(
      `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.kyc_status, u.is_verified,
              k.id as kyc_id, k.full_name as kyc_full_name, k.phone as kyc_phone, 
              k.date_of_birth as kyc_date_of_birth, k.gender as kyc_gender,
              k.address_line1 as kyc_address_line1, k.barangay as kyc_barangay,
              k.city as kyc_city, k.province as kyc_province,
              k.id_type as kyc_id_type, k.id_number as kyc_id_number,
              k.id_front_url as kyc_id_front_url, k.id_back_url as kyc_id_back_url,
              k.selfie_url as kyc_selfie_url, k.admin_notes as kyc_notes,
              k.submitted_at as kyc_submitted_at, k.status as kyc_status
       FROM users u
       LEFT JOIN kyc_submissions k ON k.user_id = u.id AND k.status IN ('submitted', 'under_review')
       WHERE u.role = 'resident'
       ORDER BY k.submitted_at DESC`
    )

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        full_name: r.full_name,
        email: r.email,
        avatar_url: r.avatar_url,
        is_verified: Boolean(r.is_verified),
        kyc: r.kyc_id ? {
          id: r.kyc_id,
          full_name: r.kyc_full_name,
          phone: r.kyc_phone,
          date_of_birth: r.kyc_date_of_birth,
          gender: r.kyc_gender,
          address_line1: r.kyc_address_line1,
          barangay: r.kyc_barangay,
          city: r.kyc_city,
          province: r.kyc_province,
          id_type: r.kyc_id_type,
          id_number: r.kyc_id_number,
          id_front_url: r.kyc_id_front_url,
          id_back_url: r.kyc_id_back_url,
          selfie_url: r.kyc_selfie_url,
          notes: r.kyc_notes,
          submitted_at: r.kyc_submitted_at,
          status: r.kyc_status,
        } : null,
      })),
    }, { headers })
  } catch (e) {
    console.error("Verifications fetch error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500, headers })
  }
}
