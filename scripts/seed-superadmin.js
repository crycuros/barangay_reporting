const bcrypt = require('bcryptjs');

// Database connection config - UPDATE THESE IF NEEDED
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'barangay_system'
};

const mysql = require('mysql2/promise');

async function seedSuperAdmin() {
  const email = 'superadmin@barangay.gov.ph';
  const password = 'superadmin123';
  const fullName = 'Super Administrator';
  const role = 'super_admin';
  const approvalStatus = 'approved';

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check if super_admin already exists
    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE role = 'super_admin'"
    );

    if (existing.length > 0) {
      console.log('Super Admin already exists');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hashed');

    // Insert super admin
    await connection.execute(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status, is_verified) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [email, passwordHash, fullName, role, approvalStatus]
    );

    console.log('Super Admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

seedSuperAdmin();