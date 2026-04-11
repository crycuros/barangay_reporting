import { NextResponse, type NextRequest } from "next/server"
import { getSessionFromRequest, verifySession } from "@/lib/auth/session"

/** Paths that do not require login */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/announcements",
]

/** Routes only for admin/official (not resident) */
const ADMIN_PATHS = ["/dashboard", "/reports", "/officials", "/profile"]

/** Routes only for resident */
const RESIDENT_ONLY_PATHS = ["/resident"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isResidentOnlyPath(pathname: string) {
  return RESIDENT_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next({ request })
  }

  const token = getSessionFromRequest(request.cookies)
  const session = token ? await verifySession(token) : null

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  const role = session.role ?? null

  if (role === "resident") {
    if (isAdminPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = "/resident"
      return NextResponse.redirect(url)
    }
  }

  if (role === "official" || role === "admin") {
    if (isResidentOnlyPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next({ request })
}
