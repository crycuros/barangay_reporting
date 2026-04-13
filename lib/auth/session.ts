import { SignJWT, jwtVerify } from "jose"

const COOKIE_NAME = "barangay_session"
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || "barangay-secret-change-in-production"
)

export type SessionPayload = {
  sub: string // user id
  email: string
  role: string
  exp: number
}

const EXPIRY = "7d" // 7 days

export async function createSession(userId: string, email: string, role: string): Promise<string> {
  const token = await new SignJWT({ email, role })
    .setSubject(String(userId))
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const sub = payload.sub
    if (!sub) return null
    return {
      sub: String(sub),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "resident"),
      exp: Number(payload.exp ?? 0),
    }
  } catch {
    return null
  }
}

export function getSessionCookieName() {
  return COOKIE_NAME
}

export function getSessionFromRequest(
  cookies: { get: (name: string) => { value: string } | undefined },
  headers?: { get: (name: string) => string | null }
): string | null {
  // Try to get from Next.js cookies API first (for web browsers)
  const cookie = cookies.get(getSessionCookieName())
  console.log("getSessionFromRequest - cookie name:", getSessionCookieName())
  console.log("getSessionFromRequest - cookie value:", cookie?.value ? "present" : "not present")
  if (cookie?.value) {
    return cookie.value
  }
  
  // Check Authorization header (for mobile/Flutter apps)
  if (headers) {
    const authHeader = headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      return token
    }
    
    // Fallback: Parse from raw Cookie header (for cross-origin web requests)
    const cookieHeader = headers.get('cookie')
    console.log("getSessionFromRequest - raw cookie header:", cookieHeader)
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${getSessionCookieName()}=([^;]+)`))
      if (match) {
        return match[1]
      }
    }
  }
  
  return null
}
