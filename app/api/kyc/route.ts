import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { execute, queryOne, queryAll } from "@/lib/db"
import { getCorsHeaders } from "@/lib/cors"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

// GET - Get current user's KYC submission
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const userId = parseInt(session.sub, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user session" }, { status: 400, headers })
    }

    const submission = await queryOne(
      `SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )

    return NextResponse.json({ success: true, data: submission }, { headers })
  } catch (e) {
    console.error("KYC GET error:", e)
    return NextResponse.json({ success: false, error: "Failed to fetch KYC data" }, { status: 500, headers })
  }
}

// POST - Create or update KYC submission
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    console.log("=== KYC POST START ===")
    const token = getSessionFromRequest(request.cookies, request.headers)
    console.log("Token:", token ? "present" : "missing")
    
    const session = token ? await verifySession(token) : null
    if (!session) {
      console.log("No session")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    console.log("Session verified, sub:", session.sub)
    const body = await request.json()
    console.log("Body keys:", Object.keys(body))

    const {
      step,
      full_name,
      phone,
      date_of_birth,
      gender,
      address_line1,
      address_line2,
      barangay,
      city,
      province,
      postal_code,
      zone,
      id_type,
      id_number,
      id_front_url,
      id_back_url,
      selfie_url,
    } = body

    const userId = parseInt(session.sub, 10)
    console.log("userId parse result:", userId, "isNaN:", isNaN(userId))

    // Check if user already has a submission
    console.log("KYC POST: Checking existing...");
    const existing = await queryOne(
      `SELECT id, status FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )
    console.log("KYC POST: Existing:", existing)

    let submissionId: number

    if (existing) {
      // Update existing submission
      if (existing.status === 'approved') {
        return NextResponse.json(
          { success: false, error: "KYC already approved. Cannot modify." },
          { status: 400, headers }
        )
      }

      const updates: string[] = []
      const values: any[] = []

      if (full_name) { updates.push('full_name = ?'); values.push(full_name) }
      if (phone) { updates.push('phone = ?'); values.push(phone) }
      if (date_of_birth) { updates.push('date_of_birth = ?'); values.push(date_of_birth) }
      if (gender) { updates.push('gender = ?'); values.push(gender) }
      if (address_line1) { updates.push('address_line1 = ?'); values.push(address_line1) }
      if (address_line2) { updates.push('address_line2 = ?'); values.push(address_line2) }
      if (barangay) { updates.push('barangay = ?'); values.push(barangay) }
      if (city) { updates.push('city = ?'); values.push(city) }
      if (province) { updates.push('province = ?'); values.push(province) }
      if (postal_code) { updates.push('postal_code = ?'); values.push(postal_code) }
      if (zone) { updates.push('zone = ?'); values.push(zone) }
      if (id_type) { updates.push('id_type = ?'); values.push(id_type) }
      if (id_number) { updates.push('id_number = ?'); values.push(id_number) }
      if (id_front_url) { updates.push('id_front_url = ?'); values.push(id_front_url) }
      if (id_back_url) { updates.push('id_back_url = ?'); values.push(id_back_url) }
      if (selfie_url) { updates.push('selfie_url = ?'); values.push(selfie_url) }

      values.push(existing.id)

      if (updates.length > 0) {
        await execute(
          `UPDATE kyc_submissions SET ${updates.join(', ')} WHERE id = ?`,
          values
        )
      }

      submissionId = existing.id

      // Log activity (optional - silently ignore errors)
      execute(
        `INSERT INTO kyc_activity_log (kyc_submission_id, user_id, action, old_status, new_status, notes)
         VALUES (?, ?, 'updated', ?, ?, ?)`,
        [submissionId, userId, existing.status, existing.status, `Updated step ${step || 'unknown'}`]
      ).catch(() => {})
    } else {
      // Create new submission
      const user = await queryOne(`SELECT email, full_name FROM users WHERE id = ?`, [userId])
      
      const result: any = await execute(
        `INSERT INTO kyc_submissions (
          user_id, full_name, email, phone, date_of_birth, gender,
          address_line1, address_line2, barangay, city, province, postal_code, zone,
          id_type, id_number, id_front_url, id_back_url, selfie_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          userId,
          full_name || user?.full_name || '',
          user?.email || '',
          phone || null,
          date_of_birth || null,
          gender || null,
          address_line1 || null,
          address_line2 || null,
          barangay || null,
          city || null,
          province || null,
          postal_code || null,
          zone || null,
          id_type || null,
          id_number || null,
          id_front_url || null,
          id_back_url || null,
          selfie_url || null,
        ]
      )

      submissionId = result.insertId

      // Log activity (optional - silently ignore errors)
      execute(
        `INSERT INTO kyc_activity_log (kyc_submission_id, user_id, action, new_status)
         VALUES (?, ?, 'created', 'draft')`,
        [submissionId, userId]
      ).catch(() => {})
    }

    // Get updated submission
    const submission = await queryOne(`SELECT * FROM kyc_submissions WHERE id = ?`, [submissionId])

    return NextResponse.json({ success: true, data: submission }, { headers })
  } catch (e) {
    console.error("KYC POST error:", e)
    const errMsg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: "Failed to save KYC data: " + errMsg }, { status: 500, headers })
  }
}

// PUT - Submit KYC for review
export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined
  const headers = getCorsHeaders(origin)

  try {
    const token = getSessionFromRequest(request.cookies, request.headers)
    const session = token ? await verifySession(token) : null
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers })
    }

    const userId = parseInt(session.sub, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user session" }, { status: 400, headers })
    }

    const submission = await queryOne(
      `SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )

    if (!submission) {
      return NextResponse.json({ success: false, error: "No KYC submission found" }, { status: 404, headers })
    }

    // Validate required fields
    const requiredFields = ['full_name', 'phone', 'date_of_birth', 'address_line1', 'id_type', 'id_number', 'id_front_url', 'id_back_url', 'selfie_url']
    const missingFields = requiredFields.filter(field => {
      const val = submission[field]
      return !val || (typeof val === 'string' && val.trim() === '')
    })

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400, headers }
      )
    }

    // Calculate risk score (simple algorithm)
    let riskScore = 0
    let riskLevel = 'low'

    // Age check
    if (submission.date_of_birth) {
      const age = new Date().getFullYear() - new Date(submission.date_of_birth).getFullYear()
      if (age < 18) riskScore += 30
      else if (age > 80) riskScore += 20
    }

    // Complete address = lower risk
    if (!submission.address_line2) riskScore += 10
    if (!submission.postal_code) riskScore += 10

    if (riskScore >= 50) riskLevel = 'high'
    else if (riskScore >= 25) riskLevel = 'medium'

    // Update submission to submitted status
    await execute(
      `UPDATE kyc_submissions 
       SET status = 'submitted', submitted_at = NOW(), risk_score = ?, risk_level = ?
       WHERE id = ?`,
      [riskScore, riskLevel, submission.id]
    )

    // Update user kyc_status
    await execute(
      `UPDATE users SET kyc_status = 'pending' WHERE id = ?`,
      [userId]
    )

    // Log activity (optional - silently ignore errors)
    execute(
      `INSERT INTO kyc_activity_log (kyc_submission_id, user_id, action, old_status, new_status)
       VALUES (?, ?, 'submitted', 'draft', 'submitted')`,
      [submission.id, userId]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "KYC submitted for review" }, { headers })
  } catch (e) {
    console.error("KYC PUT error:", e)
    return NextResponse.json({ success: false, error: "Failed to submit KYC" }, { status: 500, headers })
  }
}
