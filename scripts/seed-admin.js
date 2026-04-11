/**
 * Seed first admin user (run once after creating users table).
 * Usage: node scripts/seed-admin.js
 * Default: admin@barangay867.gov / admin123
 */
const mysql = require("mysql2/promise")
const bcrypt = require("bcryptjs")

const email = process.env.ADMIN_EMAIL || "admin@barangay.gov.ph"
const password = process.env.ADMIN_PASSWORD || "admin123"
const fullName = process.env.ADMIN_NAME || "Barangay Admin"

async function main() {
  const hash = await bcrypt.hash(password, 10)
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "barangay_system",
  })
  await pool.execute(
    "INSERT INTO users (email, password_hash, full_name, role, is_verified, kyc_status) VALUES (?, ?, ?, ?, TRUE, 'approved') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = VALUES(role), is_verified = TRUE, kyc_status = 'approved'",
    [email, hash, fullName, "admin"]
  )
  console.log("Admin user ready:", email)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
