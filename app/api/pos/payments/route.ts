import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    let sql = `SELECT p.*, o.order_number, o.total as order_total, u.full_name as created_by_name,
                      u_waiter.full_name as waiter_name
               FROM payments p
               JOIN orders o ON o.id = p.order_id
               LEFT JOIN users u ON u.id = p.created_by
               LEFT JOIN users u_waiter ON u_waiter.id = p.waiter_id`
    const params: string[] = []
    if (posId) { sql += " WHERE o.point_of_sale_id = $1"; params.push(posId) }
    sql += " ORDER BY p.created_at DESC LIMIT 100"
    return NextResponse.json(await query(sql, params))
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { orderId, paymentMethod, amountCash, amountMobile, amountCard, waiterId } = await request.json()
    if (!orderId || !paymentMethod) return NextResponse.json({ error: "Champs requis" }, { status: 400 })

    const order = await query("SELECT *, order_number FROM orders WHERE id = $1", [orderId])
    if (!order[0]) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })

    const orderNumber = order[0].order_number
    const totalPaid = (amountCash || 0) + (amountMobile || 0) + (amountCard || 0)
    const changeAmount = Math.max(0, totalPaid - Number(order[0].total))
    const invoiceNumber = generateRef("FACT")

    // Resolve waiter: use provided waiterId, or the order creator
    const resolvedWaiterId = waiterId || order[0].created_by || null

    const result = await query(
      `INSERT INTO payments (order_id, invoice_number, payment_method, amount_cash, amount_mobile, amount_card, total_paid, change_amount, created_by, waiter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [orderId, invoiceNumber, paymentMethod, amountCash || 0, amountMobile || 0, amountCard || 0, totalPaid, changeAmount, session?.id || null, resolvedWaiterId]
    )

    // Update order status to delivered
    await query("UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1", [orderId])

    // Update cash session if open
    const cashSession = await query(
      "SELECT id FROM cash_sessions WHERE status = 'open' AND point_of_sale_id = (SELECT point_of_sale_id FROM orders WHERE id = $1)",
      [orderId]
    )
    if (cashSession[0]) {
      await query(
        `UPDATE cash_sessions SET total_sales = total_sales + $1, total_cash = total_cash + $2,
         total_mobile = total_mobile + $3, total_card = total_card + $4 WHERE id = $5`,
        [Number(order[0].total), amountCash || 0, amountMobile || 0, amountCard || 0, cashSession[0].id]
      )
    }

    // Record in accounting journal
    await query(
      `INSERT INTO accounting_entries (entry_date, reference, description, entry_type, debit, credit, point_of_sale_id, related_id, created_by)
       VALUES (CURRENT_DATE, $1, $2, 'revenue', 0, $3, $4, $5, $6)`,
      [invoiceNumber, `Vente ${invoiceNumber} - ${orderNumber}`, Number(order[0].total), order[0].point_of_sale_id, result[0].id, session?.id || null]
    ).catch(() => {}) // Don't fail if accounting table doesn't exist yet

    // Update POS stock based on order items
    const orderItems = await query(
      `SELECT oi.quantity, mi.product_id 
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = $1 AND mi.product_id IS NOT NULL`,
      [orderId]
    )

    for (const item of orderItems) {
      if (item.product_id) {
        // Deduct quantity from POS stock
        await query(
          `UPDATE pos_stock 
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE product_id = $2 AND point_of_sale_id = $3`,
          [item.quantity, item.product_id, order[0].point_of_sale_id]
        )

        // Record stock movement
        await query(
          `INSERT INTO stock_movements (product_id, point_of_sale_id, movement_type, quantity, reference, notes, created_by)
           VALUES ($1, $2, 'sale', $3, $4, $5, $6)`,
          [item.product_id, order[0].point_of_sale_id, -item.quantity, invoiceNumber, `Vente ${orderNumber}`, session?.id || null]
        ).catch(() => {}) // Don't fail if stock_movements table doesn't exist
      }
    }

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
