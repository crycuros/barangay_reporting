# Barangay System

A web-based barangay management system built with Next.js, MySQL (XAMPP), and Tailwind CSS.

## Features

- **User Registration & Login** - Residents can create accounts and log in
- **Report Submission** - Residents can submit reports/complaints
- **Report Management** - Officials can manage and respond to reports
- **Announcements** - Officials can post announcements
- **Export Reports** - Generate and export CSV summary reports
- **Dashboard** - Official dashboard with stats and notifications
- **Access Control** - Role-based authentication (admin, official, resident)

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** MySQL (via XAMPP)
- **Authentication:** Session-based with bcrypt

## Prerequisites

- Node.js 18+
- XAMPP (MySQL)
- Git

## Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/crycuros/barangay_reporting.git
cd barangay_reporting
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

Make sure XAMPP is running with MySQL enabled.

Create a `.env.local` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=barangay_system
```

### 4. Setup Database

Run the migration script to create all database tables:

```bash
npm run migrate
```

Then create the admin user:

```bash
npm run seed-admin
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Login Credentials

- **Admin Login:** http://localhost:3000/admin-login
- **Email:** admin@barangay.gov.ph
- **Password:** admin123

## Project Structure

```
barangay-system/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── admin/            # Admin pages
│   ├── resident/         # Resident pages
│   └── ...               # Other pages
├── components/            # React components
├── lib/                   # Utility functions & database
├── scripts/               # Database migration scripts
│   ├── complete-database.sql
│   ├── migrate-all.js
│   └── seed-admin.js
└── public/                # Static assets
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run migrate` | Run database migration |
| `npm run seed-admin` | Create admin user |

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API endpoints.

## License

MIT