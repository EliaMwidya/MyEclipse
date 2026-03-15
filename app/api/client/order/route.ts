import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateRef } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { pointOfSaleId, tableId, items, clientName, notes } = await request.json()
    if (!pointOfSaleId || !items || items.length === 0) {
      return NextResponse.json({ error: "Commande vide" }, { status: 400 })
    }

    const orderNumber = generateRef("QR")
    let subtotal = 0
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice
    }
    const settings = await query("SELECT value FROM settings WHERE key = 'tva_rate'")
    const taxRate = settings[0] ? Number(settings[0].value) / 100 : 0.18
    const taxAmount = Math.round(subtotal * taxRate)
    const total = subtotal + taxAmount

    const orderResult = await query(
      `INSERT INTO orders (order_number, point_of_sale_id, table_id, order_type, subtotal, tax_amount, total, notes, client_name)
       VALUES ($1, $2, $3, 'qr_order', $4, $5, $6, $7, $8) RETURNING *`,
      [orderNumber, pointOfSaleId, tableId || null, subtotal, taxAmount, total, notes || "", clientName || "Client QR"]
    )
    const order = orderResult[0]

    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.menuItemId, item.itemName, item.quantity, item.unitPrice, itemTotal]
      )
    }

    // Create notification
    await query(
      `INSERT INTO notifications (point_of_sale_id, type, title, message, related_order_id)
       VALUES ($1, 'new_qr_order', 'Nouvelle commande QR', $2, $3)`,
      [pointOfSaleId, `Commande ${orderNumber} de ${clientName || "Client QR"} - ${total.toLocaleString()} CDF`, order.id]
    )

    if (tableId) {
      await query("UPDATE restaurant_tables SET status = 'occupied' WHERE id = $1", [tableId])
    }

    return NextResponse.json({ orderId: order.id, orderNumber, total })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    if (!orderId) return NextResponse.json({ error: "ID requis" }, { status: 400 })
    const order = await query(
      `SELECT o.*, t.table_number FROM orders o LEFT JOIN restaurant_tables t ON t.id = o.table_id WHERE o.id = $1`, [orderId]
    )
    if (!order[0]) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    const items = await query("SELECT * FROM order_items WHERE order_id = $1", [orderId])
    return NextResponse.json({ ...order[0], items })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
