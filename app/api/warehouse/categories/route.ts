import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const cats = await query("SELECT * FROM product_categories ORDER BY name")
    return NextResponse.json(cats)
  } catch (error) {
    console.error("Categories GET error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json()
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    const result = await query(
      "INSERT INTO product_categories (name, description) VALUES ($1, $2) RETURNING *",
      [name, description || ""]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Categories POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
