import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: "No token found in cookies",
        cookies: request.cookies.getAll()
      })
    }

    const session = await verifySession(token)
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: "Session verification failed",
        token: token.substring(0, 20) + "..."
      })
    }

    return NextResponse.json({
      success: true,
      session: session,
      userId: session.sub,
      userIdAsNumber: Number(session.sub),
      isNaN: isNaN(Number(session.sub))
    })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    })
  }
}
