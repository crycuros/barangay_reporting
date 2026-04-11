import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { AdminCreateUser } from "@/components/admin-create-user"

export default async function AdminUsersPage() {
  const cookieStore = await cookies()
  const token = getSessionFromRequest(cookieStore)
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect("/admin-login")
  }
  if (session.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />
      <main className="ml-64 p-6">
        <div className="max-w-xl">
          <AdminCreateUser />
        </div>
      </main>
    </div>
  )
}
