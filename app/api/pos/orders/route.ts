import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    const status = searchParams.get("status")
    let sql = `SELECT o.*, t.table_number, u.full_name as created_by_name, pos.name as pos_name
               FROM orders o
               LEFT JOIN restaurant_tables t ON t.id = o.table_id
               LEFT JOIN users u ON u.id = o.created_by
               LEFT JOIN points_of_sale pos ON pos.id = o.point_of_sale_id
               WHERE 1=1`
    const params: (string | number)[] = []
    let idx = 1
    if (posId) { sql += ` AND o.point_of_sale_id = $${idx}`; params.push(posId); idx++ }
    if (status) { sql += ` AND o.status = $${idx}`; params.push(status); idx++ }
    sql += " ORDER BY o.created_at DESC LIMIT 100"
    const orders = await query(sql, params)

    // Fetch items for each order
    for (const order of orders) {
      const items = await query("SELECT * FROM order_items WHERE order_id = $1", [order.id])
      ;(order as Record<string, unknown>).items = items
    }

    return NextResponse.json(orders)
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { pointOfSaleId, tableId, orderType, items, notes, clientName } = await request.json()
    if (!pointOfSaleId || !items || items.length === 0) {
      return NextResponse.json({ error: "Commande vide" }, { status: 400 })
    }

    const orderNumber = generateRef("CMD")
    let subtotal = 0

    // Calculate subtotal
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice + (item.optionsTotal || 0)
    }

    // Get tax rate
    const settings = await query("SELECT value FROM settings WHERE key = 'tva_rate'")
    const taxRate = settings[0] ? Number(settings[0].value) / 100 : 0.18
    const taxAmount = Math.round(subtotal * taxRate)
    const total = subtotal + taxAmount

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (order_number, point_of_sale_id, table_id, order_type, subtotal, tax_amount, total, notes, client_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [orderNumber, pointOfSaleId, tableId || null, orderType || "dine_in", subtotal, taxAmount, total, notes || "", clientName || "", session?.id || null]
    )
    const order = orderResult[0]

    // Create order items
    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice + (item.optionsTotal || 0)
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, options_json, options_total, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [order.id, item.menuItemId || null, item.itemName, item.quantity, item.unitPrice,
         JSON.stringify(item.options || []), item.optionsTotal || 0, itemTotal]
      )
    }

    // Update table status
    if (tableId) {
      await query("UPDATE restaurant_tables SET status = 'occupied' WHERE id = $1", [tableId])
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
