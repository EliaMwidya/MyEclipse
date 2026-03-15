import { cookies } from "next/headers"
import { query, queryOne } from "./db"
import crypto from "crypto"

// Simple password hashing using crypto (no external deps needed)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return hash === verify
}

// Session management using signed tokens
function signToken(payload: Record<string, unknown>): string {
  const secret = process.env.SESSION_SECRET || "eclipse-default-secret-change-me"
  const data = JSON.stringify(payload)
  const encoded = Buffer.from(data).toString("base64url")
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url")
  return `${encoded}.${signature}`
}

function verifyToken(token: string): Record<string, unknown> | null {
  const secret = process.env.SESSION_SECRET || "eclipse-default-secret-change-me"
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return null
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url")
  if (signature !== expected) return null
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString())
  } catch {
    return null
  }
}

export interface SessionUser {
  id: string
  email: string
  full_name: string
  role: string
  point_of_sale_id: string | null
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = signToken({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    point_of_sale_id: user.point_of_sale_id,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })
  const cookieStore = await cookies()
  cookieStore.set("eclipse_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("eclipse_session")?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (typeof payload.exp === "number" && payload.exp < Date.now()) return null
  return {
    id: payload.id as string,
    email: payload.email as string,
    full_name: payload.full_name as string,
    role: payload.role as string,
    point_of_sale_id: (payload.point_of_sale_id as string) || null,
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("eclipse_session")
}

export async function loginUser(email: string, password: string): Promise<SessionUser | null> {
  const user = await queryOne<{
    id: string
    email: string
    password_hash: string
    full_name: string
    role: string
    point_of_sale_id: string | null
    is_active: boolean
  }>("SELECT * FROM users WHERE email = $1", [email])

  if (!user || !user.is_active) return null
  if (!verifyPassword(password, user.password_hash)) return null

  const session: SessionUser = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    point_of_sale_id: user.point_of_sale_id,
  }
  await createSession(session)
  return session
}

export async function setupAdmin(
  email: string,
  password: string,
  fullName: string
): Promise<boolean> {
  const existing = await query("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1")
  if (existing.length > 0) return false

  const passwordHash = hashPassword(password)
  await query(
    "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
    [email, passwordHash, fullName, "super_admin"]
  )
  return true
}
