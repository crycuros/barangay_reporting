import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute, queryOne, queryAll } from "@/lib/db"
import { getCorsHeaders } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

// GET - Get all KYC submissions (admin only)
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = `
      SELECT 
        k.*,
        u.email as user_email,
        u.role as user_role,
        reviewer.full_name as reviewer_name
      FROM kyc_submissions k
      LEFT JOIN users u ON k.user_id = u.id
      LEFT JOIN users reviewer ON k.reviewed_by = reviewer.id
    `
    const params: any[] = []

    if (status) {
      query += ` WHERE k.status = ?`
      params.push(status)
    }

    query += ` ORDER BY k.submitted_at DESC, k.created_at DESC`

    const submissions = await queryAll(query, params)

    return NextResponse.json({ success: true, data: submissions }, { headers })
  } catch (e) {
    console.error("Admin KYC GET error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch KYC submissions" }, { status: 500, headers })
  }
}

// PATCH - Approve or reject KYC submission
export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const body = await request.json()
    const { submission_id, action, reason, notes } = body

    if (!submission_id || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400, headers })
    }

    if (!['approve', 'reject', 'request_review'].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400, headers })
    }

    const submission = await queryOne(
      `SELECT * FROM kyc_submissions WHERE id = ?`,
      [submission_id]
    )

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404, headers })
    }

    let newStatus: string
    let userKycStatus: string
    let isVerified = false

    switch (action) {
      case 'approve':
        newStatus = 'approved'
        userKycStatus = 'approved'
        isVerified = true
        break
      case 'reject':
        if (!reason) {
          return NextResponse.json({ success: false, error: "Rejection reason required" }, { status: 400, headers })
        }
        newStatus = 'rejected'
        userKycStatus = 'rejected'
        break
      case 'request_review':
        newStatus = 'under_review'
        userKycStatus = 'under_review'
        break
      default:
        newStatus = submission.status
        userKycStatus = submission.status
    }

    // Update submission
    await execute(
      `UPDATE kyc_submissions 
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?, admin_notes = ?
       WHERE id = ?`,
      [newStatus, session.sub, reason || null, notes || null, submission_id]
    )

    // Update user status
    await execute(
      `UPDATE users SET kyc_status = ?, is_verified = ? WHERE id = ?`,
      [userKycStatus, isVerified, submission.user_id]
    )

    // Log activity
    await execute(
      `INSERT INTO kyc_activity_log (kyc_submission_id, user_id, action, actor_id, old_status, new_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [submission_id, submission.user_id, action, session.sub, submission.status, newStatus, notes || reason || null]
    )

    return NextResponse.json({ 
      success: true, 
      message: `KYC ${action}${action === 'approve' ? 'd' : action === 'reject' ? 'ed' : ''} successfully` 
    }, { headers })
  } catch (e) {
    console.error("Admin KYC PATCH error:", e)
    return NextResponse.json({ success: false, error: "Failed to update KYC status" }, { status: 500, headers })
  }
}
