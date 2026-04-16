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
const MIN_WIDTH = 300
const MIN_HEIGHT = 200

function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  // Check for JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break
      const marker = buffer[offset + 1]
      // SOF markers
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        }
      }
      const length = buffer.readUInt16BE(offset + 2)
      offset += 2 + length
    }
  }
  // Check for PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    }
  }
  return null
}

function validateIDImage(width: number, height: number, type: string | null): { valid: boolean; error?: string } {
  const aspectRatio = width / height
  
  // Selfie should be portrait (face)
  if (type === 'selfie') {
    if (width < 200 || height < 200) {
      return { valid: false, error: "Selfie image is too small. Please upload a clearer photo." }
    }
    // Selfie can be portrait or square
    if (aspectRatio > 2) {
      return { valid: false, error: "Please upload a proper selfie photo (face visible)." }
    }
    return { valid: true }
  }
  
  // ID cards should be landscape and have reasonable dimensions
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return { valid: false, error: `Image too small. Minimum ${MIN_WIDTH}x${MIN_HEIGHT} pixels required.` }
  }
  
  // ID cards are typically landscape (width > height)
  if (aspectRatio < 0.5) {
    return { valid: false, error: "Please upload a landscape ID photo (wide format)." }
  }
  
  // ID cards shouldn't be too wide (usually 1.3 to 2.0 aspect ratio for IDs)
  if (aspectRatio > 3) {
    return { valid: false, error: "This doesn't look like an ID card. Please upload a clear ID photo." }
  }
  
  return { valid: true }
}

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

    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate image dimensions only for KYC uploads
    const isKycType = type === 'id_front' || type === 'id_back' || type === 'selfie'
    if (isKycType) {
      const dimensions = getImageDimensions(buffer)
      if (!dimensions) {
        return NextResponse.json({ success: false, error: "Invalid image file. Please upload a valid photo." }, { status: 400, headers })
      }
      const validation = validateIDImage(dimensions.width, dimensions.height, type)
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400, headers })
      }
    }

    const subFolder = isKycType ? "kyc" : "messages"
    const uploadDir = path.join(process.cwd(), "public", "uploads", subFolder, userId)
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${type || "file"}_${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    const url = `/uploads/${subFolder}/${userId}/${fileName}`

    console.log("File uploaded:", url)

    return NextResponse.json({ success: true, data: { url } }, { headers })
  } catch (e) {
    console.error("Upload error:", e)
    const errorMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: `Upload failed: ${errorMsg}` }, { status: 500, headers })
  }
}