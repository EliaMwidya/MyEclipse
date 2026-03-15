import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function GET() {
  try {
    const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings")
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({})
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    for (const [key, value] of Object.entries(body)) {
      await execute(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()",
        [key, String(value)]
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings PUT error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
