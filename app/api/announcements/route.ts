import { type NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { normalizeAnnouncementImage } from "@/lib/server/image-url"
import { publishEvent } from "@/lib/server/realtime"

export async function GET(request: NextRequest) {
  try {
    console.log("=== Announcements GET ===")
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    console.log("Session:", session?.sub, session?.role)
    
    const rows = await queryAll<any>("SELECT * FROM announcements ORDER BY created_at DESC", [])
    console.log("Found announcements:", rows.length)
    
    // If user is resident, fetch their liked announcements using the standard pattern
    let userLikedAnnouncements: string[] = []
    if (session && session.role === "resident" && session.sub) {
      const likedRows = await queryAll<any>(
        "SELECT announcement_id FROM announcement_likes WHERE user_id = ?",
        [session.sub]
      )
      userLikedAnnouncements = likedRows.map(row => row.announcement_id)
    }

    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => {
        const announcementId = String(r.id)
        const isLiked = userLikedAnnouncements.includes(announcementId)
        return {
          id: announcementId,
          title: r.title,
          content: r.content,
          type: r.type,
          priority: r.priority,
          author: r.author,
          isActive: Boolean(r.is_active),
          status: r.status || "active",
          createdAt: r.created_at,
          created_at: r.created_at,
          updatedAt: r.updated_at,
          imageUrl: normalizeAnnouncementImage(r.image_url),
          likes: typeof r.likes === "number" ? r.likes : Number(r.likes) || 0,
          location: r.location || null,
          userHasLiked: isLiked,
        }
      }),
    })
  } catch (e) {
    console.error("Announcements GET error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Announcements POST ===")
    const token = getSessionFromRequest(request.cookies, request.headers)
    console.log("Token present:", !!token)
    const session = token ? await verifySession(token) : null
    console.log("Session:", session?.sub, session?.role)
    
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      console.log("Unauthorized - role:", session?.role)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Creating announcement:", body.title)
    
    const result = await execute(
      "INSERT INTO announcements (title, content, type, priority, author, image_url, likes, location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [body.title, body.content, body.type || "general", body.priority || "normal", body.author || "Official", body.image_url || null, body.likes || 0, body.location || null, body.status || "active"]
    )
    console.log("Insert result:", result)
    publishEvent("announcements.updated", { action: "created", id: String(result.insertId) })

    return NextResponse.json({
      success: true,
      data: { id: String(result.insertId), title: body.title, content: body.content, type: body.type, priority: body.priority, author: body.author || "Official", imageUrl: normalizeAnnouncementImage(body.image_url), likes: body.likes || 0, location: body.location || null, status: body.status || "active", created_at: new Date().toISOString() },
    })
  } catch (e) {
    console.error("Announcements POST error:", e)
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 })
  }
}
