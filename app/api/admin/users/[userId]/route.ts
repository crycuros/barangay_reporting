import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute } from "@/lib/db"
import { getCorsHeaders, handleOptions } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return handleOptions(origin)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)
  
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { userId } = await params
    const body = await request.json()
    const action = body?.action === "approve" ? "approve" : body?.action === "reject" ? "reject" : null

    if (!action) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400, headers })
    }

    if (action === "approve") {
      await execute(
        "UPDATE users SET approval_status = 'approved', is_verified = 1 WHERE id = ? AND role = 'official'",
        [userId]
      )
    } else {
      await execute(
        "UPDATE users SET approval_status = 'rejected', is_verified = 0 WHERE id = ? AND role = 'official'",
        [userId]
      )
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    console.error("User approval update error:", e)
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500, headers })
  }
}