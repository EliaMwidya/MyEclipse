import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const pos = await query("SELECT * FROM points_of_sale ORDER BY name")
    return NextResponse.json(pos)
  } catch (error) {
    console.error("POS locations GET error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const { name, address } = await request.json()
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    const result = await query(
      "INSERT INTO points_of_sale (name, address) VALUES ($1, $2) RETURNING *",
      [name, address || ""]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("POS locations POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
