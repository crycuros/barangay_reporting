import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { queryOne } from "@/lib/db"
import { createSession, getSessionCookieName } from "@/lib/auth/session"

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
  return new NextResponse(null, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  // Add CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400, headers: corsHeaders }
      )
    }

    const user = await queryOne<{ id: number; email: string; password_hash: string; full_name: string | null; role: string }>(
      "SELECT id, email, password_hash, full_name, role FROM users WHERE email = ? AND role = 'admin'",
      [email]
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401, headers: corsHeaders }
      )
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401, headers: corsHeaders }
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
      },
    }, { headers: corsHeaders })

    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return res
  } catch (e) {
    console.error("Admin login error:", e)
    return NextResponse.json(
      { success: false, error: "Admin login failed" },
      { status: 500, headers: corsHeaders }
    )
  }
}
