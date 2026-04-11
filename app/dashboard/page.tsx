import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/roles"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = getSessionFromRequest(cookieStore)
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect("/admin-login")
  }

  if (!isAdmin(session.role)) {
    redirect("/resident")
  }

  return <DashboardContent />
}
