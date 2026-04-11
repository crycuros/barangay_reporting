import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute } from "@/lib/db"
import { getCorsHeaders } from "@/lib/cors"
import { isAdmin } from "@/lib/auth/roles"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const body = await request.json()
    const { full_name } = body

    if (typeof full_name !== "string") {
      return NextResponse.json({ success: false, error: "Invalid full_name" }, { status: 400, headers })
    }

    await execute("UPDATE users SET full_name = ? WHERE id = ?", [full_name.trim(), session.sub])
    
    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    console.error("Admin profile update error:", e)
    const errorMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: `Failed to update: ${errorMsg}` }, { status: 500, headers })
  }
}
