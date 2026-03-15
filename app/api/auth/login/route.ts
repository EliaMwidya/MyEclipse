import { NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })
    }
    const user = await loginUser(email, password)
    if (!user) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })
    }
    return NextResponse.json({ user })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
