import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"
import { canManageUsers } from "@/lib/auth/roles"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { AdminCreateUser } from "@/components/admin-create-user"
import { AdminUserApprovals } from "@/components/admin-user-approvals"

export default async function AdminUsersPage() {
  const cookieStore = await cookies()
  const token = getSessionFromRequest(cookieStore)
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect("/admin-login")
  }
  if (!canManageUsers(session.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminHeader />
      <main className="ml-64 p-6 space-y-6">
        <AdminUserApprovals />
        {session.role === "super_admin" ? (
          <div className="max-w-xl">
            <AdminCreateUser />
          </div>
        ) : null}
      </main>
    </div>
  )
}
