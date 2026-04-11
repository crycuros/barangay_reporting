import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function GET() {
  try {
    const annTotal = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM announcements", [])
    const annActive = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM announcements WHERE is_active = 1", [])

    const repTotal = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM reports", [])
    const repPending = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'", [])
    const repProgress = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM reports WHERE status = 'in-progress'", [])
    const repResolved = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM reports WHERE status = 'resolved'", [])
    const repClosed = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM reports WHERE status = 'closed'", [])

    const offTotal = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM officials", [])
    const offActive = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM officials WHERE is_active = 1", [])

    const userTotal = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM users", [])
    const userResidents = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM users WHERE role = 'resident'", [])
    const userAdmins = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','official')", [])

    return NextResponse.json({
      success: true,
      data: {
        announcements: { total: annTotal?.c || 0, active: annActive?.c || 0 },
        reports: {
          total: repTotal?.c || 0,
          pending: repPending?.c || 0,
          inProgress: repProgress?.c || 0,
          resolved: repResolved?.c || 0,
          closed: repClosed?.c || 0,
        },
        officials: { total: offTotal?.c || 0, active: offActive?.c || 0 },
        users: { total: userTotal?.c || 0, residents: userResidents?.c || 0, admins: userAdmins?.c || 0 },
      },
    })
  } catch (e) {
    console.error("Stats error:", e)
    return NextResponse.json({
      success: true,
      data: {
        announcements: { total: 0, active: 0 },
        reports: { total: 0, pending: 0, inProgress: 0, resolved: 0, closed: 0 },
        officials: { total: 0, active: 0 },
        users: { total: 0, residents: 0, admins: 0 },
      },
    })
  }
}
