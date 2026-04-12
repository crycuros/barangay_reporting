-- ============================================
-- BARANGAY SYSTEM DATABASE - COMPLETE SCHEMA
-- For XAMPP MySQL
-- ============================================

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) DEFAULT NULL,
  role ENUM('resident', 'official', 'admin', 'super_admin') NOT NULL DEFAULT 'resident',
  avatar_url LONGTEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  kyc_status ENUM('none', 'pending', 'under_review', 'approved', 'rejected') DEFAULT 'none',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);

-- Resident profiles (additional info)
CREATE TABLE IF NOT EXISTS resident_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  zone VARCHAR(100),
  date_of_birth DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resident_profiles_user_id ON resident_profiles(user_id);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  author VARCHAR(100) DEFAULT 'Official',
  image_url TEXT,
  likes INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_status ON announcements(status);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'other',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  reporter_name VARCHAR(100) DEFAULT 'Anonymous',
  reporter_contact VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  response TEXT,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message_at DATETIME DEFAULT NULL,
  unread_by_admin TINYINT(1) DEFAULT 0,
  unread_by_resident TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_updated ON reports(updated_at DESC);

-- Officials
CREATE TABLE IF NOT EXISTS officials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  contact VARCHAR(50),
  email VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_officials_department ON officials(department);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT NULL,
  processed_by INT DEFAULT NULL,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Certificate Requests (with purpose field)
CREATE TABLE IF NOT EXISTS certificate_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  purpose TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT NULL,
  processed_by INT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 2. ADDITIONAL TABLES
-- ============================================

-- Announcement likes
CREATE TABLE IF NOT EXISTS announcement_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_announcement_user (announcement_id, user_id),
  INDEX idx_announcement (announcement_id),
  INDEX idx_user (user_id)
);

-- Report messages (chat feature)
CREATE TABLE IF NOT EXISTS report_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id INT NOT NULL,
  user_id INT NULL,
  message TEXT NOT NULL,
  is_system_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_report_id (report_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KYC Submissions
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  barangay VARCHAR(100),
  city VARCHAR(100) DEFAULT 'Your City',
  province VARCHAR(100) DEFAULT 'Your Province',
  postal_code VARCHAR(20),
  zone VARCHAR(100),
  id_type ENUM('national_id', 'drivers_license', 'passport', 'voters_id', 'senior_citizen_id', 'pwd_id'),
  id_number VARCHAR(100),
  id_front_url LONGTEXT,
  id_back_url LONGTEXT,
  selfie_url LONGTEXT,
  liveness_score DECIMAL(3,2) DEFAULT 0.00,
  risk_score INT DEFAULT 0,
  risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
  sanctions_check BOOLEAN DEFAULT FALSE,
  pep_check BOOLEAN DEFAULT FALSE,
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected') DEFAULT 'draft',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  admin_notes TEXT NULL,
  submitted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_kyc_user_id ON kyc_submissions(user_id);
CREATE INDEX idx_kyc_status ON kyc_submissions(status);
CREATE INDEX idx_kyc_risk_level ON kyc_submissions(risk_level);
CREATE INDEX idx_kyc_submitted_at ON kyc_submissions(submitted_at);

-- KYC Activity Log
CREATE TABLE IF NOT EXISTS kyc_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kyc_submission_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor_id INT NULL,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kyc_submission_id) REFERENCES kyc_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_kyc_log_submission ON kyc_activity_log(kyc_submission_id);
CREATE INDEX idx_kyc_log_user ON kyc_activity_log(user_id);
CREATE INDEX idx_kyc_log_created ON kyc_activity_log(created_at);

-- ============================================
-- 3b. ADDITIONAL TABLES

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'general',
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT,
  target_user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- 3. SEED DATA (Sample Data)
-- ============================================

-- Insert sample announcements
INSERT INTO announcements (title, content, type, priority, author) VALUES
  ('Community Clean-up Drive', 'Join us this Saturday for our monthly community clean-up drive. Meeting point at the barangay hall at 7:00 AM.', 'event', 'medium', 'Barangay Hall'),
  ('Water Interruption Notice', 'Water supply will be temporarily interrupted for maintenance work.', 'maintenance', 'high', 'Technical Office'),
  ('Barangay Assembly Meeting', 'All residents are invited to attend the quarterly barangay assembly.', 'general', 'medium', 'Barangay Captain'),
  ('Holiday Schedule', 'Barangay office will be closed for the holiday season.', 'general', 'low', 'Admin');

-- Insert sample officials
INSERT INTO officials (name, position, department, contact, email) VALUES
  ('Juan Dela Cruz', 'Barangay Captain', 'Executive', '+63 912 345 6789', 'captain@barangay.gov.ph'),
  ('Maria Santos', 'Barangay Secretary', 'Administration', '+63 912 345 6790', 'secretary@barangay.gov.ph'),
  ('Pedro Reyes', 'Barangay Treasurer', 'Finance', '+63 912 345 6791', 'treasurer@barangay.gov.ph'),
  ('Ana Garcia', 'Kagawad - Health', 'Health Services', '+63 912 345 6792', 'health@barangay.gov.ph'),
  ('Jose Martinez', 'Kagawad - Peace and Order', 'Security', '+63 912 345 6793', 'security@barangay.gov.ph');

-- Insert sample reports
INSERT INTO reports (type, title, description, location, reporter_name, reporter_contact, status) VALUES
  ('waste', 'Uncollected Garbage', 'Garbage has not been collected for 3 days on this street.', 'Main Street', 'Juan dela Cruz', '+63 912 111 1111', 'pending'),
  ('infrastructure', 'Broken Streetlight', 'Streetlight near the basketball court is not working.', 'Basketball Court Area', 'Maria Santos', '+63 912 222 2222', 'in-progress'),
  ('other', 'Noise Complaint', 'Loud music from a neighbor during nighttime.', 'Block 5', 'Pedro Reyes', '+63 912 333 3333', 'resolved');


-- Run these create statements:
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'general',
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT,
  target_user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- ============================================
-- 4. ADMIN USER (Default Admin Account)
-- ============================================
-- Note: Admin user will be created by running: node scripts/seed-admin.js
-- Default admin credentials:
-- Email: admin@barangay.gov.ph
-- Password: admin123

-- ============================================
-- 5. SUPER ADMIN USER (Highest Authority)
-- ============================================
-- Run: node scripts/seed-superadmin.js
-- Default super_admin credentials:
-- Email: superadmin@barangay.gov.ph
-- Password: superadmin123