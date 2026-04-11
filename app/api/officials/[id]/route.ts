import { type NextRequest, NextResponse } from "next/server"
import { execute, queryOne } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    let photoUrl: string | null = null
    if (body.imageBase64 && typeof body.imageBase64 === "string") {
      photoUrl = body.imageBase64
    }

    const fields: string[] = []
    const values: any[] = []
    if (body.name !== undefined) { fields.push("name = ?"); values.push(body.name) }
    if (body.position !== undefined) { fields.push("position = ?"); values.push(body.position) }
    if (body.contact !== undefined) { fields.push("contact = ?"); values.push(body.contact) }
    if (body.email !== undefined) { fields.push("email = ?"); values.push(body.email) }
    if (body.department !== undefined) { fields.push("department = ?"); values.push(body.department) }
    if (photoUrl) { fields.push("photo = ?"); values.push(photoUrl) }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: "No fields" }, { status: 400 })
    }

    values.push(id)
    await execute(`UPDATE officials SET ${fields.join(", ")} WHERE id = ?`, values)

    const updated = await queryOne("SELECT * FROM officials WHERE id = ?", [id])
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error("Officials PATCH error:", e)
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
    await execute("DELETE FROM officials WHERE id = ?", [id])
    return NextResponse.json({ success: true, message: "Deleted" })
  } catch (e) {
    console.error("Officials DELETE error:", e)
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 })
  }
}
