import bcrypt from "bcryptjs"
import { execute } from "../lib/db"

async function seedSuperAdmin() {
  const email = "superadmin@barangay.gov.ph"
  const password = "superadmin123"
  const fullName = "Super Administrator"
  const role = "super_admin"
  const approvalStatus = "approved"

  try {
    // Check if super_admin already exists
    const existing = await execute(
      "SELECT id FROM users WHERE role = ?",
      [role]
    )

    if (existing?.affectedRows > 0) {
      console.log("Super Admin already exists")
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert super admin
    await execute(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status, is_verified) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [email, passwordHash, fullName, role, approvalStatus]
    )

    console.log("Super Admin created successfully!")
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
  } catch (error) {
    console.error("Error seeding super admin:", error)
  }
}

seedSuperAdmin()