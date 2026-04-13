import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { isOfficial } from "@/lib/auth/roles"
import { AdminCertificatesClient } from "@/components/admin-certificates-client"

export default async function AdminCertificatesPage() {
  const cookieStore = await cookies()
  const token = getSessionFromRequest(cookieStore)
  const session = token ? await verifySession(token) : null

  if (!session) redirect("/admin-login")
  if (!isOfficial(session.role)) redirect("/dashboard")

  return <AdminCertificatesClient />
}
