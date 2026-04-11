import { NextResponse } from "next/server"

// Allow credentials for localhost (any port)
function getAllowOrigin(origin?: string) {
  // Allow any localhost origin (for Flutter web dev server)
  if (origin && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
    return origin
  }
  // Default to wildcard for non-credentialed requests
  return "*"
}

export function getCorsHeaders(origin?: string) {
  const allowOrigin = getAllowOrigin(origin)
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, Accept",
  }
  
  // Only include credentials header if we're allowing a specific origin
  if (allowOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true"
  }
  
  return headers
}

export const corsHeaders = getCorsHeaders()

export function handleCors(request?: Request) {
  const origin = request?.headers.get("origin") || undefined
  return getCorsHeaders(origin)
}

export function corsResponse(data: any, status?: number, origin?: string) {
  return NextResponse.json(data, { 
    status, 
    headers: getCorsHeaders(origin) 
  })
}

export function handleOptions(origin?: string) {
  return new NextResponse(null, { headers: getCorsHeaders(origin) })
}
