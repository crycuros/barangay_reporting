import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute, queryOne } from "@/lib/db"
import { getCorsHeaders } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      console.error("Avatar POST: No session found")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const formData = await request.formData()
    const file = formData.get("image") as File | null
    const base64 = formData.get("base64") as string | null

    let avatarData: string | null = null
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer())
      avatarData = `data:${file.type};base64,${buf.toString("base64")}`
    } else if (base64 && typeof base64 === "string") {
      avatarData = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
    }

    if (!avatarData || avatarData.length > 2_000_000) {
      return NextResponse.json({ success: false, error: "Image too large. Please upload a smaller image (max 1.5MB)." }, { status: 400, headers })
    }

    console.log("Saving avatar for user:", session.sub)
    console.log("Avatar data length:", avatarData.length)
    
    const result: any = await execute("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarData, session.sub])
    console.log("Update result:", result)
    console.log("Changed rows:", result.changedRows)
    console.log("Warning count:", result.warningCount)
    
    // Get warnings if any
    if (result.warningCount > 0) {
      const warnings = await queryOne("SHOW WARNINGS", [])
      console.log("SQL Warnings:", warnings)
    }
    
    // Verify it was saved
    const checkUser = await queryOne("SELECT id, avatar_url FROM users WHERE id = ?", [session.sub])
    console.log("Verified user avatar_url length:", checkUser?.avatar_url?.length)
    
    return NextResponse.json({ success: true, data: { avatar_url: avatarData } }, { headers })
  } catch (e) {
    console.error("Avatar upload error:", e)
    const errorMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: `Failed to upload: ${errorMsg}` }, { status: 500, headers })
  }
}
