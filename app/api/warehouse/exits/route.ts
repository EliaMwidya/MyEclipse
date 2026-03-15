import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const exits = await query(
      `SELECT se.*, p.name as product_name, p.conversion_rate, pos.name as pos_name, u.full_name as created_by_name
       FROM stock_exits se
       LEFT JOIN products p ON p.id = se.product_id
       LEFT JOIN points_of_sale pos ON pos.id = se.point_of_sale_id
       LEFT JOIN users u ON u.id = se.created_by
       ORDER BY se.created_at DESC`
    )
    return NextResponse.json(exits)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { productId, pointOfSaleId, quantityCartons, notes } = await request.json()
    if (!productId || !pointOfSaleId || !quantityCartons) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
    }

    // Check warehouse stock
    const stock = await queryOne<{ real_qty: number }>("SELECT real_qty FROM warehouse_stock WHERE product_id = $1", [productId])
    if (!stock || stock.real_qty < quantityCartons) {
      return NextResponse.json({ error: "Stock insuffisant en entrepot" }, { status: 400 })
    }

    // Get conversion rate
    const product = await queryOne<{ conversion_rate: number }>("SELECT conversion_rate FROM products WHERE id = $1", [productId])
    const conversionRate = product?.conversion_rate || 1
    const reference = generateRef("BL")

    const result = await query(
      `INSERT INTO stock_exits (reference, product_id, point_of_sale_id, quantity_cartons, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [reference, productId, pointOfSaleId, quantityCartons, notes || "", session?.id || null]
    )

    // Decrease warehouse stock
    await query(
      `UPDATE warehouse_stock SET real_qty = real_qty - $1, theoretical_qty = theoretical_qty - $1, updated_at = NOW()
       WHERE product_id = $2`,
      [quantityCartons, productId]
    )

    // Increase POS stock (convert cartons to units)
    const unitsToAdd = quantityCartons * conversionRate
    await query(
      `INSERT INTO pos_stock (point_of_sale_id, product_id, quantity_units)
       VALUES ($1, $2, $3)
       ON CONFLICT (point_of_sale_id, product_id)
       DO UPDATE SET quantity_units = pos_stock.quantity_units + $3, updated_at = NOW()`,
      [pointOfSaleId, productId, unitsToAdd]
    )

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
