import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== "resident") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("id_image") as File | null
    const base64 = formData.get("base64") as string | null

    let imageData: string | null = null
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer())
      imageData = `data:${file.type};base64,${buf.toString("base64")}`
    } else if (base64 && typeof base64 === "string") {
      imageData = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
    }

    if (!imageData || imageData.length > 1_000_000) {
      return NextResponse.json({ success: false, error: "Invalid or too large image" }, { status: 400 })
    }

    await execute(
      "UPDATE users SET kyc_status = 'pending', kyc_id_image = ?, kyc_submitted_at = NOW() WHERE id = ?",
      [imageData, session.sub]
    )
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("KYC submit error:", e)
    return NextResponse.json({ success: false, error: "Failed to submit" }, { status: 500 })
  }
}
