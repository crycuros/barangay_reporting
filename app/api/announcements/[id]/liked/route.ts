import { type NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { getCorsHeaders } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { id } = await params
    const userId = session.sub

    const existingLike = await queryOne(
      "SELECT id FROM announcement_likes WHERE announcement_id = ? AND user_id = ?",
      [id, userId]
    )

    return NextResponse.json({ 
      success: true, 
      userHasLiked: !!existingLike 
    }, { headers })
  } catch (e) {
    console.error("Check like error:", e)
    return NextResponse.json({ success: false, error: "Failed to check like status" }, { status: 500, headers })
  }
}
