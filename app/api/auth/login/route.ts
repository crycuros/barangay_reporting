import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { queryOne } from "@/lib/db"
import { createSession, getSessionCookieName } from "@/lib/auth/session"
import { getCorsHeaders, handleOptions } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return handleOptions(origin)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400, headers }
      )
    }

    const user = await queryOne<{ id: number; email: string; password_hash: string; full_name: string | null; role: string; approval_status: string }>(
      "SELECT id, email, password_hash, full_name, role, COALESCE(approval_status, 'approved') as approval_status FROM users WHERE email = ?",
      [email]
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401, headers }
      )
    }

    if (user.role === "official" && user.approval_status !== "approved") {
      return NextResponse.json(
        { success: false, error: "Your account is pending approval. Please contact the admin." },
        { status: 403, headers }
      )
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401, headers }
      )
    }

    const token = await createSession(String(user.id), user.email, user.role)
    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: String(user.id),
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        token: token, // Include token in response body for mobile/cross-origin clients
      },
    }, { headers })

    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return res
  } catch (e) {
    console.error("Login error:", e)
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500, headers }
    )
  }
}
