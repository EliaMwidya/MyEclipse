import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

async function verifyToken(token: string, secret: string): Promise<any | null> {
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return null

  // Import the secret key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  // Generate expected signature
  const expectedBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded)
  )

  const expected = btoa(String.fromCharCode(...new Uint8Array(expectedBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  if (signature !== expected) return null

  // Decode payload
  return JSON.parse(Buffer.from(encoded, "base64url").toString())
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value
  const secret = process.env.SESSION_SECRET || "default-secret"

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const data = await verifyToken(token, secret)

  if (!data) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
