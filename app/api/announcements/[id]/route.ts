import { type NextRequest, NextResponse } from "next/server"
import { execute, queryOne, queryAll } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { normalizeAnnouncementImage } from "@/lib/server/image-url"
import { publishEvent } from "@/lib/server/realtime"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null

    const { id } = await params
    const body = await request.json()

    // Handle like/unlike — allow only residents
    if (typeof body.toggleLike === "boolean") {
      if (!session || session.role !== "resident") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }

      const userId = session.sub
      const announcementId = id

      // Check if already liked (following the recommended pattern)
      const existingLike = await queryOne(
        "SELECT id FROM announcement_likes WHERE announcement_id = ? AND user_id = ?",
        [announcementId, userId]
      )

      if (body.toggleLike) {
        // Add like if not already liked
        if (!existingLike) {
          await execute(
            "INSERT INTO announcement_likes (announcement_id, user_id) VALUES (?, ?)",
            [announcementId, userId]
          )
          await execute(
            "UPDATE announcements SET likes = COALESCE(likes, 0) + 1 WHERE id = ?",
            [announcementId]
          )
        }
      } else {
        // Remove like if exists
        if (existingLike) {
          await execute(
            "DELETE FROM announcement_likes WHERE announcement_id = ? AND user_id = ?",
            [announcementId, userId]
          )
          await execute(
            "UPDATE announcements SET likes = GREATEST(0, COALESCE(likes, 0) - 1) WHERE id = ?",
            [announcementId]
          )
        }
      }

      const updated = await queryOne("SELECT * FROM announcements WHERE id = ?", [announcementId])
      const userHasLiked = !!(await queryOne(
        "SELECT id FROM announcement_likes WHERE announcement_id = ? AND user_id = ?",
        [announcementId, userId]
      ))

      return NextResponse.json({
        success: true,
        data: {
          id: String(updated.id),
          title: updated.title,
          content: updated.content,
          type: updated.type,
          priority: updated.priority,
          author: updated.author,
          isActive: Boolean(updated.is_active),
          status: updated.status || "active",
          createdAt: updated.created_at,
          created_at: updated.created_at,
          updatedAt: updated.updated_at,
          imageUrl: normalizeAnnouncementImage(updated.image_url),
          likes: typeof updated.likes === "number" ? updated.likes : Number(updated.likes) || 0,
          location: updated.location || null,
        },
        userHasLiked,
      })
    }

    const fields: string[] = []
    const values: any[] = []
    if (body.title !== undefined) { fields.push("title = ?"); values.push(body.title) }
    if (body.content !== undefined) { fields.push("content = ?"); values.push(body.content) }
    if (body.type !== undefined) { fields.push("type = ?"); values.push(body.type) }
    if (body.priority !== undefined) { fields.push("priority = ?"); values.push(body.priority) }
    if (body.image_url !== undefined) { fields.push("image_url = ?"); values.push(body.image_url) }
    if (body.location !== undefined) { fields.push("location = ?"); values.push(body.location) }
    if (body.status !== undefined) { fields.push("status = ?"); values.push(body.status) }

    // non-like updates require admin/official
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      console.log("Unauthorized - session role:", session?.role)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const currentAnnouncement = await queryOne<{ status: string }>("SELECT status FROM announcements WHERE id = ?", [id])
    const currentStatus = String(currentAnnouncement?.status || "").toLowerCase().trim()
    if (currentStatus === "resolved") {
      return NextResponse.json(
        { success: false, error: "Announcement is already resolved and cannot be modified" },
        { status: 409 }
      )
    }

    console.log("PATCH announcement:", id, "fields:", fields, "session:", session?.role)

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    values.push(id)
    await execute(`UPDATE announcements SET ${fields.join(", ")} WHERE id = ?`, values)
    publishEvent("announcements.updated", { action: "updated", id: String(id) })

    const updated = await queryOne("SELECT * FROM announcements WHERE id = ?", [id])
    return NextResponse.json({
      success: true,
      data: {
        id: String(updated.id),
        title: updated.title,
        content: updated.content,
        type: updated.type,
        priority: updated.priority,
        author: updated.author,
        isActive: Boolean(updated.is_active),
        status: updated.status || "active",
        createdAt: updated.created_at,
        created_at: updated.created_at,
        updatedAt: updated.updated_at,
        imageUrl: normalizeAnnouncementImage(updated.image_url),
        likes: typeof updated.likes === "number" ? updated.likes : Number(updated.likes) || 0,
        location: updated.location || null,
      },
    })
  } catch (e) {
    console.error("Announcements PATCH error:", e)
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await execute("DELETE FROM announcements WHERE id = ?", [id])
    publishEvent("announcements.updated", { action: "deleted", id: String(id) })
    return NextResponse.json({ success: true, message: "Deleted" })
  } catch (e) {
    console.error("Announcements DELETE error:", e)
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 })
  }
}
