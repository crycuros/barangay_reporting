import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Only run auth middleware on protected routes to avoid unnecessary redirects/requests
export const config = {
  matcher: [
    "/profile/:path*",
    "/resident/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/reports/:path*",
    "/officials/:path*",
  ],
}
