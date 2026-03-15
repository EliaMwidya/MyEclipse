import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const suppliers = await query("SELECT * FROM suppliers ORDER BY name")
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const { name, contact, phone, email, address } = await request.json()
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    const result = await query(
      "INSERT INTO suppliers (name, contact, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, contact || "", phone || "", email || "", address || ""]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
