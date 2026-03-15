import { NextResponse } from "next/server"
import { setupAdmin } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json()
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }
    const success = await setupAdmin(email, password, fullName)
    if (!success) {
      return NextResponse.json({ error: "Un administrateur existe deja" }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
