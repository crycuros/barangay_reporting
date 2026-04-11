import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { getCorsHeaders, handleOptions } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return handleOptions(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || (session.role !== "admin" && session.role !== "official")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const type = new URL(request.url).searchParams.get("type") || "all"
    const status = new URL(request.url).searchParams.get("status") || "all"

    let whereClause = ""
    const params: any[] = []
    
    if (type !== "all") {
      whereClause += " WHERE type = ?"
      params.push(type)
    }
    
    if (status !== "all") {
      if (whereClause) {
        whereClause += " AND status = ?"
      } else {
        whereClause += " WHERE status = ?"
      }
      params.push(status)
    }

    const rows = await queryAll<{
      id: number; type: string; title: string; description: string; location: string;
      reporter_name: string; reporter_contact: string; status: string; response: string | null;
      created_at: string; updated_at: string
    }>(`SELECT * FROM reports${whereClause} ORDER BY created_at DESC`, params)

    const csvHeader = "ID,Type,Title,Description,Location,Reporter Name,Reporter Contact,Status,Response,Created At,Updated At"
    const csvRows = rows.map(r => [
      r.id,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${(r.location || "").replace(/"/g, '""')}"`,
      `"${(r.reporter_name || "").replace(/"/g, '""')}"`,
      `"${(r.reporter_contact || "").replace(/"/g, '""')}"`,
      r.status,
      `"${(r.response || "").replace(/"/g, '""')}"`,
      r.created_at,
      r.updated_at
    ].join(","))

    const csvContent = [csvHeader, ...csvRows].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        ...headers,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="reports_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (e) {
    console.error("Export CSV error:", e)
    return NextResponse.json({ success: false, error: "Failed to export" }, { status: 500, headers })
  }
}