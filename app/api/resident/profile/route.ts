import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryOne, execute } from "@/lib/db"
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
    
    console.log("Profile GET - Session:", session)
    
    if (!session || !session.sub) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    console.log("Profile GET - User ID:", session.sub)
    
    const userId = Number(session.sub)
    console.log("Profile GET - Converted User ID:", userId, "Type:", typeof userId)
    
    if (isNaN(userId)) {
      console.error("Invalid user ID - cannot convert to number:", session.sub)
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401, headers })
    }

    // Get user info
    const user = await queryOne<{
      id: number
      email: string
      full_name: string | null
      role: string
      avatar_url: string | null
      is_verified: number | null
      kyc_status: string | null
      created_at: string
    }>(
      "SELECT id, email, full_name, role, avatar_url, COALESCE(is_verified, 0) as is_verified, kyc_status, created_at FROM users WHERE id = ?",
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers }
      )
    }

    // Get resident profile from database
    const profile = await queryOne<{ 
      phone: string | null
      address: string | null
      zone: string | null
      date_of_birth: string | null
    }>(
      "SELECT phone, address, zone, date_of_birth FROM resident_profiles WHERE user_id = ?",
      [Number(session.sub)]
    )

    return NextResponse.json({
      success: true,
      data: {
        id: String(user.id),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        is_verified: Boolean(user.is_verified),
        kyc_status: user.kyc_status || "none",
        created_at: user.created_at,
        phone: profile?.phone || null,
        address: profile?.address || null,
        zone: profile?.zone || null,
        date_of_birth: profile?.date_of_birth || null,
      }
    }, { headers })
  } catch (e) {
    console.error("Profile fetch error:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { success: false, error: `Failed to fetch profile: ${errorMessage}` },
      { status: 500, headers }
    )
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || !session.sub) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const body = await request.json()
    const { full_name, phone, address, zone, date_of_birth } = body

    // Update users table
    if (full_name !== undefined) {
      await execute(
        "UPDATE users SET full_name = ? WHERE id = ?",
        [full_name || null, Number(session.sub)]
      )
    }

    // Check if profile exists
    const existingProfile = await queryOne<{ user_id: number }>(
      "SELECT user_id FROM resident_profiles WHERE user_id = ?",
      [Number(session.sub)]
    )

    if (existingProfile) {
      // Update existing profile
      const updates: string[] = []
      const values: any[] = []

      if (phone !== undefined) {
        updates.push("phone = ?")
        values.push(phone || null)
      }
      if (address !== undefined) {
        updates.push("address = ?")
        values.push(address || null)
      }
      if (zone !== undefined) {
        updates.push("zone = ?")
        values.push(zone || null)
      }
      if (date_of_birth !== undefined) {
        updates.push("date_of_birth = ?")
        values.push(date_of_birth || null)
      }

      if (updates.length > 0) {
        values.push(Number(session.sub))
        await execute(
          `UPDATE resident_profiles SET ${updates.join(", ")} WHERE user_id = ?`,
          values
        )
      }
    } else {
      // Create new profile
      await execute(
        "INSERT INTO resident_profiles (user_id, phone, address, zone, date_of_birth) VALUES (?, ?, ?, ?, ?)",
        [Number(session.sub), phone || null, address || null, zone || null, date_of_birth || null]
      )
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    console.error("Profile update error:", e)
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500, headers }
    )
  }
}
