"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Megaphone, FileText, Users, Settings, UserPlus, ShieldCheck, Contact, Scroll } from "lucide-react"
import { useAuth } from "@/lib/auth/context"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/officials", label: "Officials", icon: Users },
  { href: "/admin/residents", label: "Residents", icon: Contact },
  { href: "/admin/certificates", label: "Certificates", icon: Scroll },
  { href: "/admin/users", label: "Users", icon: UserPlus },
  { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/profile", label: "Profile", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center border-b px-6">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Barangay 867 Logo" 
              className="h-10 w-10 rounded-lg object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">Barangay 867</span>
              <span className="text-xs leading-none text-muted-foreground mt-0.5">Zone 95 District VI</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{user?.email || "Admin"}</div>
            <div className="mt-0.5">Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
