import mysql from "mysql2/promise"

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "barangay_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  try {
    console.log("queryOne SQL:", sql)
    console.log("queryOne params:", params)
    const [rows] = await pool.execute(sql, params || [])
    const results = rows as any[]
    if (results.length === 0) return null
    return results[0] as T
  } catch (error) {
    console.error("Database queryOne error:", error)
    console.error("SQL was:", sql)
    console.error("Params were:", params)
    throw error
  }
}

export async function queryAll<T>(sql: string, params: any[]): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params)
    return rows as T[]
  } catch (error) {
    console.error("Database queryAll error:", error)
    throw error
  }
}

export async function execute(sql: string, params: any[]): Promise<any> {
  try {
    const [result] = await pool.execute(sql, params)
    return result
  } catch (error) {
    console.error("Database execute error:", error)
    throw error
  }
}
