import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryOne } from "@/lib/db"

export async function GET(
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

    const resident = await queryOne<any>(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, COALESCE(u.is_verified, 0) as is_verified, u.kyc_status,
              rp.phone, rp.address, rp.zone, rp.date_of_birth
       FROM users u
       LEFT JOIN resident_profiles rp ON rp.user_id = u.id
       WHERE u.id = ? AND u.role = 'resident'
       LIMIT 1`,
      [id]
    )

    if (!resident) {
      return NextResponse.json({ success: false, error: "Resident not found" }, { status: 404 })
    }

    const latestKyc = await queryOne<any>(
      `SELECT id_type, id_number, id_front_url, id_back_url, selfie_url, status, submitted_at, reviewed_at, rejection_reason, admin_notes
       FROM kyc_submissions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      data: {
        id: String(resident.id),
        email: resident.email,
        full_name: resident.full_name,
        avatar_url: resident.avatar_url,
        is_verified: Boolean(resident.is_verified),
        kyc_status: resident.kyc_status || "none",
        phone: resident.phone,
        address: resident.address,
        zone: resident.zone,
        date_of_birth: resident.date_of_birth,
        kyc: latestKyc
          ? {
              id_type: latestKyc.id_type,
              id_number: latestKyc.id_number,
              id_front_url: latestKyc.id_front_url,
              id_back_url: latestKyc.id_back_url,
              selfie_url: latestKyc.selfie_url,
              status: latestKyc.status,
              submitted_at: latestKyc.submitted_at,
              reviewed_at: latestKyc.reviewed_at,
              rejection_reason: latestKyc.rejection_reason,
              admin_notes: latestKyc.admin_notes,
            }
          : null,
      },
    })
  } catch (e) {
    console.error("Admin resident detail error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch details" }, { status: 500 })
  }
}

