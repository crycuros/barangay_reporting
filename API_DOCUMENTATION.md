# Barangay Management System API Documentation

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.vercel.app/api`

## Authentication
Currently, the APIs are open and don't require authentication. For production use, consider adding authentication middleware.

---

## Announcements API

### Get All Announcements
**GET** `/api/announcements`

Returns all announcements sorted by creation date (newest first).

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Community Clean-up Drive",
      "content": "Join us this Saturday...",
      "type": "event",
      "priority": "medium",
      "created_at": "2024-03-10T10:00:00Z",
      "updated_at": "2024-03-10T10:00:00Z"
    }
  ]
}
\`\`\`

### Create Announcement
**POST** `/api/announcements`

**Request Body:**
\`\`\`json
{
  "title": "New Announcement",
  "content": "Announcement details...",
  "type": "emergency|event|general|maintenance",
  "priority": "urgent|high|medium|low"
}
\`\`\`

### Update Announcement
**PATCH** `/api/announcements/[id]`

**Request Body:**
\`\`\`json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "type": "event",
  "priority": "high"
}
\`\`\`

### Delete Announcement
**DELETE** `/api/announcements/[id]`

---

## Reports API

### Get All Reports
**GET** `/api/reports`

Returns all reports sorted by creation date (newest first).

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "crime|waste|missing_person|infrastructure|other",
      "description": "Report details...",
      "location": "Main St & 5th Ave",
      "reporter_name": "John Doe",
      "reporter_contact": "+63 912 345 6789",
      "status": "pending|in-progress|resolved|closed",
      "response": null,
      "created_at": "2024-03-10T10:00:00Z",
      "updated_at": "2024-03-10T10:00:00Z"
    }
  ]
}
\`\`\`

### Submit Report
**POST** `/api/reports`

**Request Body:**
\`\`\`json
{
  "type": "crime|waste|missing_person|infrastructure|other",
  "description": "Detailed description of the issue",
  "location": "Specific location",
  "reporterName": "Reporter's name",
  "reporterContact": "+63 912 345 6789"
}
\`\`\`

### Update Report Status
**PATCH** `/api/reports/[id]`

**Request Body:**
\`\`\`json
{
  "status": "in-progress|resolved|closed",
  "response": "Official response to the report"
}
\`\`\`

---

## Officials API

### Get All Officials
**GET** `/api/officials`

Returns all barangay officials.

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Juan Dela Cruz",
      "position": "Barangay Captain",
      "department": "Executive",
      "contact": "+63 912 345 6789",
      "email": "captain@barangay867.gov.ph",
      "created_at": "2024-03-10T10:00:00Z",
      "updated_at": "2024-03-10T10:00:00Z"
    }
  ]
}
\`\`\`

### Add Official
**POST** `/api/officials`

**Request Body:**
\`\`\`json
{
  "name": "Official Name",
  "position": "Position Title",
  "department": "Department Name",
  "contact": "+63 912 345 6789",
  "email": "email@example.com"
}
\`\`\`

### Update Official
**PATCH** `/api/officials/[id]`

**Request Body:**
\`\`\`json
{
  "name": "Updated Name",
  "position": "Updated Position",
  "contact": "+63 912 345 6789"
}
\`\`\`

### Delete Official
**DELETE** `/api/officials/[id]`

---

## Statistics API

### Get Dashboard Statistics
**GET** `/api/stats`

Returns aggregated statistics for the dashboard.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "announcements": {
      "total": 10,
      "active": 8
    },
    "reports": {
      "total": 25,
      "pending": 5,
      "inProgress": 8,
      "resolved": 12
    },
    "officials": {
      "total": 15,
      "active": 15
    }
  }
}
\`\`\`

---

## Mobile App Integration

### React Native Example

\`\`\`javascript
// API Service
const API_BASE_URL = 'https://your-domain.vercel.app/api';

// Fetch announcements
export const getAnnouncements = async () => {
  const response = await fetch(`${API_BASE_URL}/announcements`);
  const data = await response.json();
  return data;
};

// Submit a report
export const submitReport = async (reportData) => {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportData),
  });
  const data = await response.json();
  return data;
};

// Get officials
export const getOfficials = async () => {
  const response = await fetch(`${API_BASE_URL}/officials`);
  const data = await response.json();
  return data;
};
\`\`\`

### Flutter Example

\`\`\`dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class BarangayApiService {
  static const String baseUrl = 'https://your-domain.vercel.app/api';

  // Fetch announcements
  Future<List<dynamic>> getAnnouncements() async {
    final response = await http.get(Uri.parse('$baseUrl/announcements'));
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    }
    throw Exception('Failed to load announcements');
  }

  // Submit report
  Future<Map<String, dynamic>> submitReport(Map<String, dynamic> reportData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/reports'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(reportData),
    );
    return json.decode(response.body);
  }
}
\`\`\`

---

## Error Responses

All endpoints return errors in this format:

\`\`\`json
{
  "success": false,
  "error": "Error message description"
}
\`\`\`

Common HTTP status codes:
- `200` - Success
- `404` - Resource not found
- `500` - Server error
