import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute, queryOne, queryAll } from "@/lib/db"
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
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const users = await queryAll<{
      id: number
      email: string
      full_name: string | null
      role: string
      phone: string | null
      address: string | null
      zone: string | null
      created_at: string
    }>(`SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.role, 
        rp.phone, 
        rp.address, 
        rp.zone, 
        u.created_at 
      FROM users u
      LEFT JOIN resident_profiles rp ON u.id = rp.user_id
      ORDER BY u.created_at DESC`)

    return NextResponse.json({
      success: true,
      data: users.map(u => ({
        id: String(u.id),
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        phone: u.phone,
        address: u.address,
        zone: u.zone,
        created_at: u.created_at,
      })),
    }, { headers })
  } catch (e) {
    console.error("Users fetch error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : ""
    const role = body.role === "official" || body.role === "admin" ? body.role : null

    if (!email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Email, password, and role (official/admin) are required" },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const existing = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email])
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)
    await execute("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)", [
      email,
      password_hash,
      fullName || null,
      role,
    ])

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 })
  }
}
