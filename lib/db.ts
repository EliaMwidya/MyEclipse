import { Pool, type QueryResultRow } from "pg"

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T[]> {
  const client = getPool()
  const result = await client.query<T>(text, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

export async function execute(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<number> {
  const client = getPool()
  const result = await client.query(text, params)
  return result.rowCount ?? 0
}

export function generateRef(prefix: string): string {
  const date = new Date()
  const y = date.getFullYear().toString().slice(-2)
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const d = date.getDate().toString().padStart(2, "0")
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `${prefix}-${y}${m}${d}-${rand}`
}
