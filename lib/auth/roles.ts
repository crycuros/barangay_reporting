/**
 * Roles in user_profiles: resident, official, admin.
 * - resident: barangay resident, can only access /resident
 * - official: barangay official, can access dashboard, reports, officials
 * - admin: same as official (full admin access)
 */
export type UserRole = "resident" | "official" | "admin"

export function isAdmin(role: string | null): boolean {
  return role === "official" || role === "admin"
}

export function isResident(role: string | null): boolean {
  return role === "resident"
}
