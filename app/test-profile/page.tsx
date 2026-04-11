"use client"

import { useEffect, useState } from "react"

export default function TestProfilePage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    fetch("/api/resident/profile")
      .then(res => res.json())
      .then(data => {
        setData(data)
      })
      .catch(err => {
        setError(err.message)
      })
  }, [])

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Profile API Test</h1>
      
      {error && (
        <div style={{ background: "red", color: "white", padding: "10px", marginTop: "20px" }}>
          <h2>Error:</h2>
          <pre>{error}</pre>
        </div>
      )}
      
      {data && (
        <div style={{ background: "#f0f0f0", padding: "10px", marginTop: "20px" }}>
          <h2>Response:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      
      {!data && !error && <p>Loading...</p>}
    </div>
  )
}
