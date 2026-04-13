import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { execute, queryOne } from "@/lib/db"
import { createSession, getSessionCookieName } from "@/lib/auth/session"
import { corsHeaders } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const roleInput = typeof body.role === "string" ? body.role : "resident"
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const address = typeof body.address === "string" ? body.address.trim() : ""
    const zone = typeof body.zone === "string" ? body.zone.trim() : ""
    const dateOfBirth = typeof body.date_of_birth === "string" ? body.date_of_birth : ""
    const department = typeof body.department === "string" ? body.department.trim() : ""
    const profilePictureBase64 = typeof body.profile_picture_base64 === "string" ? body.profile_picture_base64 : ""

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400, headers: corsHeaders }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400, headers: corsHeaders }
      )
    }

    const role = roleInput === "official" ? "official" : "resident"
    const approvalStatus = role === "official" ? "pending" : "approved"

    if (role === "official") {
      if (!department) {
        return NextResponse.json(
          { success: false, error: "Department is required for official registration" },
          { status: 400, headers: corsHeaders }
        )
      }
      if (!profilePictureBase64 || !profilePictureBase64.startsWith("data:image/")) {
        return NextResponse.json(
          { success: false, error: "Profile picture is required for official registration" },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    const existing = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email])
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 400, headers: corsHeaders }
      )
    }

    const password_hash = await bcrypt.hash(password, 10)

    console.log("Creating user account with:", { email, fullName, role, approvalStatus })
    await execute(
      "INSERT INTO users (email, password_hash, full_name, role, approval_status, avatar_url) VALUES (?, ?, ?, ?, ?, ?)",
      [email, password_hash, fullName || null, role, approvalStatus, profilePictureBase64 || null]
    )

    const userResult = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email])
    console.log("User created with ID:", userResult)
    if (!userResult) {
      return NextResponse.json(
        { success: false, error: "Registration failed" },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log("Creating resident profile with:", { user_id: userResult.id, phone, address, zone, dateOfBirth })
    await execute(
      "INSERT INTO resident_profiles (user_id, phone, address, zone, date_of_birth) VALUES (?, ?, ?, ?, ?)",
      [userResult.id, phone, address || null, zone || null, dateOfBirth || null]
    )
    console.log("Resident profile created successfully")

    if (role === "official") {
      await execute(
        "INSERT INTO officials (name, position, department, contact, email, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [fullName || email, "Barangay Official", department, phone || "", email, 0]
      ).catch(() => {})
    }

    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: String(userResult.id),
          email,
          full_name: fullName || null,
          role,
          approval_status: approvalStatus,
        },
      },
    }, { headers: corsHeaders })

    if (role === "resident") {
      const token = await createSession(String(userResult.id), email, role)
      res.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
    }

    return res
  } catch (e) {
    console.error("Register error:", e)
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500, headers: corsHeaders }
    )
  }
}
