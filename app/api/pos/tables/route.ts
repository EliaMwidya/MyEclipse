import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    let sql = "SELECT * FROM restaurant_tables"
    const params: string[] = []
    if (posId) { sql += " WHERE point_of_sale_id = $1"; params.push(posId) }
    sql += " ORDER BY table_number"
    return NextResponse.json(await query(sql, params))
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const { pointOfSaleId, tableNumber, capacity } = await request.json()
    if (!pointOfSaleId || !tableNumber) return NextResponse.json({ error: "Champs requis" }, { status: 400 })
    const result = await query(
      "INSERT INTO restaurant_tables (point_of_sale_id, table_number, capacity) VALUES ($1, $2, $3) RETURNING *",
      [pointOfSaleId, tableNumber, capacity || 4]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
