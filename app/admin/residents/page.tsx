import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/roles"
import { AdminResidentsClient } from "@/components/admin-residents-client"

export default async function AdminResidentsPage() {
  const cookieStore = await cookies()
  const token = getSessionFromRequest(cookieStore)
  const session = token ? await verifySession(token) : null

  if (!session) redirect("/admin-login")
  if (!isAdmin(session.role)) redirect("/dashboard")

  return <AdminResidentsClient />
}
