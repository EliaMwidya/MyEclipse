import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function GET() {
  try {
    return NextResponse.json(await query("SELECT * FROM menu_categories WHERE is_active = true ORDER BY sort_order, name"))
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const { name, description, sortOrder } = await request.json()
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    const result = await query(
      "INSERT INTO menu_categories (name, description, sort_order) VALUES ($1, $2, $3) RETURNING *",
      [name, description || "", sortOrder || 0]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
