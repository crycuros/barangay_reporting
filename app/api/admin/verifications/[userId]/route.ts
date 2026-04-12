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
    console.log("=== Verification PATCH START ===")
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    console.log("Session:", session?.sub, session?.role)
    
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }
    if (session.role !== "admin" && session.role !== "official") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403, headers })
    }

    const { userId } = await params
    console.log("userId from params:", userId)
    
    const body = await request.json()
    console.log("body:", body)
    
    const action = body?.action === "approve" ? "approve" : body?.action === "reject" ? "reject" : null
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null

    if (!action) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400, headers })
    }

    console.log("Executing action:", action, "for userId:", userId)
    
    if (action === "approve") {
      const result = await execute(
        "UPDATE users SET is_verified = 1, kyc_status = 'approved' WHERE id = ?",
        [userId]
      )
      console.log("Approve result:", result)
      
      // Also update kyc_submissions if exists
      await execute(
        "UPDATE kyc_submissions SET status = 'approved', reviewed_by = ? WHERE user_id = ? AND status = 'submitted'",
        [session.sub, userId]
      ).catch(() => {})
    } else {
      const result = await execute(
        "UPDATE users SET is_verified = 0, kyc_status = 'rejected' WHERE id = ?",
        [userId]
      )
      console.log("Reject result:", result)
      
      // Also update kyc_submissions if exists
      await execute(
        "UPDATE kyc_submissions SET status = 'rejected', reviewed_by = ? WHERE user_id = ? AND status = 'submitted'",
        [session.sub, userId]
      ).catch(() => {})
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    console.error("Verification update error:", e)
    const errMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: "Failed to update: " + errMsg }, { status: 500, headers })
  }
}
