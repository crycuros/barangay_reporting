# BARANGAY SYSTEM - DATABASE SCHEMA (ERD)

## Entity Relationship Diagram

```
                    +-----------------+
                    |     USERS      |
                    +-----------------+
                    | id (PK)        |
                    | email (UK)      |
                    | password_hash  |
                    | full_name      |
                    | role           |
                    | avatar_url    |
                    | is_verified   |
                    | approval_status|
                    | kyc_status    |
                    | created_at    |
                    | updated_at    |
                    +--------+--------+
                             │
     +---------------------+--+--+-----------------------+
     │                     │  │                       │
     ▼                     ▼  ▼                       ▼
+--------+          +----------------+            +---------------+
| ROLES |          |ANNOUNCEMENTS  |            | REPORTS       |
+--------+          +--------------+            +---------------+
|role_name          |id (PK)      |            |id (PK)        |
                  |title        |            |user_id (FK)   │
                  |content     |            |type          │
                  |author      |            |title         │
                  |likes       |            |description   │
                  |created_at  |            |location     │
                  +------+-------+            |status       │
                         │                 |response     │
                         ▼                 |created_at   │
                 +-------------+         +------+--------+
                 |ANNOUNCEMENT           │          ▼
                 |_LIKES             +-------------------+
                 +-------------+         | REPORT_MESSAGES  |
                 |announcement_id    |         |id (PK)        |
                 |user_id (FK)   |         |report_id (FK) |
                 +-------------+         |user_id (FK)   |
                                   |message       |
                                   +-------------+
     +-----------------+------------------+--------------------+
     │                 │                  │                    │
     ▼                 ▼                  ▼                    ▼
+------------+ +----------+ +----------------+ +--------+ +---------+
|RESIDENT_   | | KYC_     | |CERTIFICATES   | | NOTIF- | |AUDIT_   |
|PROFILES   | |SUBMIS-   | |             | |ICATIONS| |LOGS    |
+------------+ |SIONS   | +-------------+ +-------+ +---------+
|user_id (FK)| |id (PK) | |user_id (FK) | |user_id| |actor_  |
|phone      | |user_id | |cert_type   | |(FK)   | |user_id|
|address    | |full_name     |purpose     | |title  | |target_|
|zone       | |email   | |status    | |content| |user_id|
|date_of_birth| |phone   | |admin_     | |type   | |action|
           | |dob    | |notes     | |is_read| |entity|
           | |gender| |processed | |created| |_type|
           | |address     | |_by      | |       | |entity|
           | |id_type| |created_  | |       | |_id  |
           | |id_number | |at       | |       | |details|
           | |id_front | |         | |       | |ip_   |
           | |id_back | |         | |       | |addr  |
           | |selfie  | |         | |       | |created|
           | |status | |         | |       | |_at  |
           +-+------+ |         | |       | +-------+
             │      |         | |       |
             ▼      ▼         ▼ ▼
        +-----------+  +----------+
        |KYC_      |  | OFFICIALS  |
        |ACTIVITY  |  +----------+
        |_LOG     |  |name (PK) |
        +----------+  |position |
        |kyc_sub  |  |department|
        |mission_ |  |contact  |
        |id (FK) |  |email    │
        |user_id |  |is_active|
        |(FK)   |  +---------+
        |action |
        |actor_|
        |id   |
        |old_ |
        |status|
        |new_ |
        |status|
        +-----+
```

## Relationships Summary

| From | To | Relationship | Description |
|------|-------|-------------|------------|
| Users | ROLES | has | Each user has one role |
| Users | Announcements | posts | Admin/Official posts announcements |
| Users | Reports | submits | Resident submits reports |
| Users | Reports | handles | Official/Admin handles reports |
| Users | Report Messages | sends | User sends message on report |
| Users | Report Messages | receives | User receives message |
| Users | Announcement Likes | likes | User likes announcement |
| Users | KYC Submissions | submits | Resident submits KYC |
| Users | Certificates | requests | Resident requests certificate |
| Users | Notifications | receives | User receives notification |
| Users | Audit Logs | performs | User performs action logged |
| Announcements | Announcement Likes | has | Announcement has likes |
| Reports | Report Messages | has | Report has conversation |
| Resident Profiles | Users | belongs_to | Profile belongs to user |
| KYC Submissions | Users | belongs_to | KYC belongs to user |
| KYC Activity Log | KYC Submissions | tracks | Log tracks KYC changes |
| Certificates | Users | belongs_to | Certificate belongs to user |
| Notifications | Users | belongs_to | Notification belongs to user |
| Audit Logs | Users | performed_by | Actor performed action |

## Complete SQL Definitions

### USERS
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role ENUM('resident','official','admin','super_admin') DEFAULT 'resident',
  avatar_url LONGTEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  approval_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  kyc_status ENUM('none','pending','under_review','approved','rejected') DEFAULT 'none',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### RESIDENT_PROFILES
```sql
CREATE TABLE resident_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  phone VARCHAR(50),
  address TEXT,
  zone VARCHAR(100),
  date_of_birth DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### OFFICIALS
```sql
CREATE TABLE officials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  contact VARCHAR(50),
  email VARCHAR(255),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

### ANNOUNCEMENTS
```sql
CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  author VARCHAR(100),
  image_url TEXT,
  likes INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### ANNOUNCEMENT_LIKES
```sql
CREATE TABLE announcement_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT,
  user_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### REPORTS
```sql
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type VARCHAR(50) DEFAULT 'other',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  reporter_name VARCHAR(100),
  reporter_contact VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  response TEXT,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### REPORT_MESSAGES
```sql
CREATE TABLE report_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT,
  user_id INT,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### KYC_SUBMISSIONS
```sql
CREATE TABLE kyc_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  barangay VARCHAR(100),
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  zone VARCHAR(50),
  id_type VARCHAR(50),
  id_number VARCHAR(50),
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  liveness_score FLOAT DEFAULT 0,
  risk_score INT DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'low',
  sanctions_check INT DEFAULT 0,
  pep_check INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  reviewed_by INT,
  reviewed_at DATETIME,
  rejection_reason TEXT,
  admin_notes TEXT,
  submitted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### KYC_ACTIVITY_LOG
```sql
CREATE TABLE kyc_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kyc_submission_id INT,
  user_id INT,
  action VARCHAR(50),
  actor_id INT,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kyc_submission_id) REFERENCES kyc_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### CERTIFICATES
```sql
CREATE TABLE certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  certificate_type VARCHAR(50) NOT NULL,
  purpose TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  processed_by INT,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### NOTIFICATIONS
```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### AUDIT_LOGS
```sql
CREATE TABLE audit_logs (
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
```