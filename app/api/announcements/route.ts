import { type NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { normalizeAnnouncementImage } from "@/lib/server/image-url"
import { publishEvent } from "@/lib/server/realtime"

// Run once per server process to add the posted_by_user_id column if it doesn't exist
const g = globalThis as typeof globalThis & { __announcementsMigrated?: boolean }
if (!g.__announcementsMigrated) {
  g.__announcementsMigrated = true
  execute(
    "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS posted_by_user_id INT NULL",
    []
  ).catch(() => {/* column may already exist or DB not ready yet */})
}

function normalizeAvatarUrl(value: unknown): string | null {
  if (!value) return null
  const s = typeof value === "string" ? value.trim() : String(value).trim()
  if (!s) return null
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s
  if (s.startsWith("data:image/")) return s
  return null
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== Announcements GET ===")
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    console.log("Session:", session?.sub, session?.role)
    
    const rows = await queryAll<any>(
      `SELECT a.*, u.avatar_url AS author_avatar_url, u.full_name AS author_full_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.posted_by_user_id
       ORDER BY a.created_at DESC`,
      []
    )
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
          author: r.author_full_name || r.author,
          authorAvatarUrl: normalizeAvatarUrl(r.author_avatar_url),
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
    
    // Fetch poster's info for the response
    const posterRows = await queryAll<any>("SELECT full_name, avatar_url FROM users WHERE id = ?", [session.sub])
    const poster = posterRows[0] || null

    const result = await execute(
      "INSERT INTO announcements (title, content, type, priority, author, image_url, likes, location, status, posted_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [body.title, body.content, body.type || "general", body.priority || "normal", poster?.full_name || body.author || "Official", body.image_url || null, body.likes || 0, body.location || null, body.status || "active", session.sub]
    )
    console.log("Insert result:", result)
    publishEvent("announcements.updated", { action: "created", id: String(result.insertId), title: body.title || "", content: body.content || "" })

    return NextResponse.json({
      success: true,
      data: {
        id: String(result.insertId),
        title: body.title,
        content: body.content,
        type: body.type,
        priority: body.priority,
        author: poster?.full_name || body.author || "Official",
        authorAvatarUrl: normalizeAvatarUrl(poster?.avatar_url),
        imageUrl: normalizeAnnouncementImage(body.image_url),
        likes: body.likes || 0,
        location: body.location || null,
        status: body.status || "active",
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error("Announcements POST error:", e)
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 })
  }
}
