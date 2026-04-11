import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/roles"
import { AdminVerificationsClient } from "@/components/admin-verifications-client"

export default async function AdminVerificationsPage() {
  const cookieStore = await cookies()
  const token = getSessionFromRequest(cookieStore)
  const session = token ? await verifySession(token) : null

  if (!session) redirect("/admin-login")
  if (!isAdmin(session.role)) redirect("/dashboard")

  return <AdminVerificationsClient />
}
