"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SimpleProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // Get session first
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.user) {
          setUser(data.data.user)
          setLoading(false)
        } else {
          router.push("/login")
        }
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [router])

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Loading...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: "40px", color: "red" }}>
        <h2>Error: {error}</h2>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Not logged in</h2>
      </div>
    )
  }

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Simple Profile</h1>
      
      <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
        <h3>User Information</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Name:</strong> {user.full_name || "Not set"}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <button 
        onClick={() => router.push("/dashboard")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          background: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Back to Dashboard
      </button>
    </div>
  )
}
