"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type AuthUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url?: string | null
}

type AuthState = {
  user: AuthUser | null
  role: string | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true })

  useEffect(() => {
    let isMounted = true

    const fetchSession = () => {
      fetch("/api/auth/session", { credentials: "same-origin" })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return
          const user = data?.data?.user ?? null
          const role = data?.data?.role ?? data?.data?.user?.role ?? null
          setState({ user, role, loading: false })
        })
        .catch(() => {
          if (isMounted) setState({ user: null, role: null, loading: false })
        })
    }

    fetchSession()

    // Listen for custom event to refresh session (triggered after login/logout)
    const handleRefresh = () => fetchSession()
    window.addEventListener("auth:refresh", handleRefresh)

    return () => {
      isMounted = false
      window.removeEventListener("auth:refresh", handleRefresh)
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
