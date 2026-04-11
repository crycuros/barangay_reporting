import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryAll } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.trim() || ""
    const verified = url.searchParams.get("verified")

    let sql = `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url,
      COALESCE(u.is_verified, 0) as is_verified, u.kyc_status,
      rp.phone, rp.address, rp.zone, rp.date_of_birth
      FROM users u LEFT JOIN resident_profiles rp ON rp.user_id = u.id
      WHERE u.role = 'resident'`
    const params: any[] = []

    if (search) {
      sql += " AND (u.full_name LIKE ? OR u.email LIKE ? OR rp.address LIKE ?)"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (verified === "1") { sql += " AND u.is_verified = 1" }
    else if (verified === "0") { sql += " AND (u.is_verified = 0 OR u.is_verified IS NULL)" }

    sql += " ORDER BY u.id DESC"

    const rows = await queryAll<any>(sql, params)

    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        id: String(r.id),
        email: r.email,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        is_verified: Boolean(r.is_verified),
        kyc_status: r.kyc_status || "none",
        phone: r.phone,
        address: r.address,
        zone: r.zone,
        date_of_birth: r.date_of_birth,
      })),
    })
  } catch (e) {
    console.error("Admin residents error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 })
  }
}
