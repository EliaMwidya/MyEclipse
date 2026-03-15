import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    let sql = `SELECT mi.*, mc.name as category_name, p.name as product_name
               FROM menu_items mi
               LEFT JOIN menu_categories mc ON mc.id = mi.category_id
               LEFT JOIN products p ON p.id = mi.product_id`
    const params: string[] = []
    if (posId) { sql += " WHERE mi.point_of_sale_id = $1"; params.push(posId) }
    sql += " ORDER BY mc.sort_order, mi.name"
    return NextResponse.json(await query(sql, params))
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const { categoryId, productId, name, description, price, imageUrl, isAvailable, pointOfSaleId } = await request.json()
    if (!name || !price || !pointOfSaleId) return NextResponse.json({ error: "Champs requis" }, { status: 400 })
    const result = await query(
      `INSERT INTO menu_items (category_id, product_id, name, description, price, image_url, is_available, point_of_sale_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [categoryId || null, productId || null, name, description || "", price, imageUrl || null, isAvailable !== false, pointOfSaleId]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
