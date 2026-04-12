import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { getCorsHeaders } from "@/lib/cors"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const userId = session.sub
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400, headers })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "File too large. Maximum size is 2MB." }, { status: 400, headers })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400, headers })
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "kyc", userId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${type || "file"}_${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const url = `/uploads/kyc/${userId}/${fileName}`

    console.log("File uploaded:", url)

    return NextResponse.json({ success: true, data: { url } }, { headers })
  } catch (e) {
    console.error("Upload error:", e)
    const errorMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: `Upload failed: ${errorMsg}` }, { status: 500, headers })
  }
}