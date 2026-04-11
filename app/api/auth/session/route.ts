import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { queryOne } from "@/lib/db"
import { corsHeaders, handleOptions } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  return handleOptions()
}

export async function GET(request: NextRequest) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handleOptions()
  }

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    if (!token) {
      return NextResponse.json({ success: true, data: { user: null, role: null } }, { headers: corsHeaders })
    }

    const session = await verifySession(token)
    if (!session) {
      return NextResponse.json({ success: true, data: { user: null, role: null } }, { headers: corsHeaders })
    }

    const user = await queryOne<{ id: number; email: string; full_name: string | null; role: string; avatar_url: string | null }>(
      "SELECT id, email, full_name, role, avatar_url FROM users WHERE id = ?",
      [session.sub]
    )

    if (!user) {
      return NextResponse.json({ success: true, data: { user: null, role: null } }, { headers: corsHeaders })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: String(user.id),
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar_url: user.avatar_url,
        },
        role: user.role,
      },
    }, { headers: corsHeaders })
  } catch {
    return NextResponse.json({ success: true, data: { user: null, role: null } }, { headers: corsHeaders })
  }
}
