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
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const session = await verifySession(token)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

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
      "SELECT id, email, full_name, role, avatar_url, is_verified, kyc_status, created_at FROM users WHERE id = ?",
      [session.sub]
    )

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(user.id),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        is_verified: Boolean(user.is_verified),
        kyc_status: user.kyc_status,
        created_at: user.created_at,
      },
    }, { headers })
  } catch (error) {
    console.error("Me API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers })
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const session = await verifySession(token)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const body = await request.json()
    const { full_name, email } = body

    // Validate input
    if (!full_name || full_name.trim() === "") {
      return NextResponse.json({ success: false, error: "Full name is required" }, { status: 400, headers })
    }

    // Update user profile
    await execute(
      "UPDATE users SET full_name = ? WHERE id = ?",
      [full_name.trim(), Number(session.sub)]
    )

    // Get updated user data
    const updatedUser = await queryOne<{ 
      id: number
      email: string
      full_name: string | null
      role: string
      avatar_url: string | null
      is_verified: number | null
      kyc_status: string | null
      created_at: string
    }>(
      "SELECT id, email, full_name, role, avatar_url, is_verified, kyc_status, created_at FROM users WHERE id = ?",
      [session.sub]
    )

    return NextResponse.json({
      success: true,
      data: {
        id: String(updatedUser!.id),
        email: updatedUser!.email,
        full_name: updatedUser!.full_name,
        role: updatedUser!.role,
        avatar_url: updatedUser!.avatar_url,
        is_verified: Boolean(updatedUser!.is_verified),
        kyc_status: updatedUser!.kyc_status,
        created_at: updatedUser!.created_at,
      },
    }, { headers })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers })
  }
}
