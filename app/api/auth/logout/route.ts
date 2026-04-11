import { NextResponse } from "next/server"
import { getSessionCookieName } from "@/lib/auth/session"
import { corsHeaders } from "@/lib/cors"

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function POST() {
  const res = NextResponse.json({ success: true }, { headers: corsHeaders })
  res.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return res
}
