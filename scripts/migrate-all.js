// Auto-migration script for XAMPP MySQL
// Uses the consolidated complete-database.sql

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting database migration...\n');
    console.log('📦 Database: barangay_system (XAMPP MySQL)\n');

    // Create connection without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server\n');

    // Create database if not exists
    const dbName = process.env.DB_NAME || 'barangay_system';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' ready\n`);

    // Use the database
    await connection.query(`USE ${dbName}`);

    // Read and execute the complete SQL file
    const sqlFile = path.join(__dirname, 'complete-database.sql');
    
    if (fs.existsSync(sqlFile)) {
      console.log('📄 Running complete-database.sql...');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      
      await connection.query(sql);
      console.log('✅ Database schema created successfully!\n');
    } else {
      console.log('❌ complete-database.sql not found!\n');
      process.exit(1);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: node scripts/seed-admin.js');
    console.log('   2. Run: npm run dev');
    console.log('   3. Open: http://localhost:3000/admin-login\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('   1. XAMPP MySQL is running (start Apache & MySQL in XAMPP control panel)');
    console.error('   2. Database credentials in .env.local are correct');
    console.error('   3. MySQL port is 3306\n');
    
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigration();