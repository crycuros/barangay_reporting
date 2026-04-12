import mysql from "mysql2/promise"

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "barangay_system",
  connectTimeout: 15000,
}

let pool: mysql.Pool | null = null

async function resetPool() {
  console.log("Resetting database pool due to connection errors...")
  if (pool) {
    try { await pool.end() } catch {}
  }
  pool = null
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }
  return pool
}

function isConnectionError(error: any): boolean {
  if (!error) return false
  const code = error.code || error.syscall
  return code === 'ECONNRESET' || 
         code === 'ETIMEDOUT' || 
         code === 'ECONNREFUSED' ||
         code === 'PROTOCOL_CONNECTION_LOST' ||
         code === 'ER_CONNECTION_KILLED'
}

export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let conn: mysql.PoolConnection | null = null
    try {
      conn = await Promise.race([
        getPool().getConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000))
      ]) as Promise<mysql.PoolConnection>
      console.log("queryOne SQL:", sql)
      console.log("queryOne params:", params)
      const [rows] = await conn.execute(sql, params || [])
      await conn.release()
      const results = rows as any[]
      if (results.length === 0) return null
      return results[0] as T
    } catch (e) {
      console.error("queryOne error:", e)
      if (isConnectionError(e)) {
        await resetPool()
      } else if (conn) {
        try { await conn.release() } catch {}
      }
      if (attempt === maxRetries) throw e
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return null
}

export async function queryAll<T>(sql: string, params: any[]): Promise<T[]> {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let conn: mysql.PoolConnection | null = null
    try {
      conn = await Promise.race([
        getPool().getConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000))
      ]) as Promise<mysql.PoolConnection>
      const [rows] = await conn.execute(sql, params)
      await conn.release()
      return rows as T[]
    } catch (e) {
      console.error("queryAll error:", e)
      if (isConnectionError(e)) {
        await resetPool()
      } else if (conn) {
        try { await conn.release() } catch {}
      }
      if (attempt === maxRetries) throw e
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return []
}

export async function execute(sql: string, params: any[]): Promise<any> {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let conn: mysql.PoolConnection | null = null
    try {
      conn = await Promise.race([
        getPool().getConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000))
      ]) as Promise<mysql.PoolConnection>
      const [result] = await conn.execute(sql, params)
      await conn.release()
      return result
    } catch (e) {
      console.error("execute error:", e)
      if (isConnectionError(e)) {
        await resetPool()
      } else if (conn) {
        try { await conn.release() } catch {}
      }
      if (attempt === maxRetries) throw e
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return null
}
