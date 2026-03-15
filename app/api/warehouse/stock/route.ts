import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const stock = await query(
      `SELECT ws.*, p.name as product_name, p.storage_unit, p.low_stock_threshold, c.name as category_name
       FROM warehouse_stock ws
       JOIN products p ON p.id = ws.product_id
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.is_active = true
       ORDER BY p.name`
    )
    return NextResponse.json(stock)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    const { productId, newQty, reason } = await request.json()
    if (!productId || newQty === undefined) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 })
    }

    const current = await query<{ real_qty: number }>("SELECT real_qty FROM warehouse_stock WHERE product_id = $1", [productId])
    const oldQty = current[0]?.real_qty || 0

    await execute(
      "UPDATE warehouse_stock SET real_qty = $1, updated_at = NOW() WHERE product_id = $2",
      [newQty, productId]
    )

    await query(
      `INSERT INTO stock_adjustments (product_id, location_type, old_qty, new_qty, reason, created_by)
       VALUES ($1, 'warehouse', $2, $3, $4, $5)`,
      [productId, oldQty, newQty, reason || "Ajustement manuel", session?.id || null]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
