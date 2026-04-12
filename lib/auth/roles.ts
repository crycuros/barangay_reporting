/**
 * Roles in the system: resident, official, admin, super_admin
 * 
 * - resident: barangay resident, can submit KYC, reports, request certificates
 * - official: barangay staff, can manage announcements, reports, messages, view residents
 * - admin: can manage users, verify KYC, generate reports
 * - super_admin: highest authority, can manage admins, system config
 */
export type UserRole = "resident" | "official" | "admin" | "super_admin"

export function isAdmin(role: string | null): boolean {
  return role === "admin" || role === "super_admin"
}

export function isOfficial(role: string | null): boolean {
  return role === "official" || role === "admin" || role === "super_admin"
}

export function isResident(role: string | null): boolean {
  return role === "resident"
}

export function isSuperAdmin(role: string | null): boolean {
  return role === "super_admin"
}

export function canManageUsers(role: string | null): boolean {
  return role === "admin" || role === "super_admin"
}

export function canVerifyKYC(role: string | null): boolean {
  return role === "admin" || role === "super_admin"
}

export function canGenerateReports(role: string | null): boolean {
  return role === "admin" || role === "super_admin"
}
