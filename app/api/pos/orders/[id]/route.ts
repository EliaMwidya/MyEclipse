import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const orderResult = await query(
      `SELECT o.*, t.table_number, pos.name as pos_name
       FROM orders o
       LEFT JOIN restaurant_tables t ON t.id = o.table_id
       LEFT JOIN points_of_sale pos ON pos.id = o.point_of_sale_id
       WHERE o.id = $1`,
      [id]
    )
    if (!orderResult[0]) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    }
    const order = orderResult[0]
    const items = await query("SELECT * FROM order_items WHERE order_id = $1", [id])
    ;(order as Record<string, unknown>).items = items
    
    // Check if payment exists
    const payments = await query("SELECT id FROM payments WHERE order_id = $1", [id])
    ;(order as Record<string, unknown>).is_paid = payments.length > 0
    
    return NextResponse.json(order)
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, items, discount, cancelReason } = body

    // Handle status update
    if (status !== undefined) {
      // If cancelling, require a reason
      if (status === "cancelled") {
        if (!cancelReason || cancelReason.trim() === "") {
          return NextResponse.json({ error: "Motif d'annulation requis" }, { status: 400 })
        }
        await query("UPDATE orders SET status = $1, cancel_reason = $2, updated_at = NOW() WHERE id = $3", [status, cancelReason, id])
      } else {
        // Check if trying to close without payment
        if (status === "closed") {
          const payments = await query("SELECT id FROM payments WHERE order_id = $1", [id])
          if (payments.length === 0) {
            return NextResponse.json({ error: "Impossible de cloturer: le paiement n'a pas encore ete effectue" }, { status: 400 })
          }
        }

        await query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [status, id])
      }

      // If delivered, cancelled, or closed, free the table
      if (status === "delivered" || status === "cancelled" || status === "closed") {
        const order = await query("SELECT table_id FROM orders WHERE id = $1", [id])
        if (order[0]?.table_id) {
          // Check if there are other active orders for this table
          const activeOrders = await query(
            "SELECT id FROM orders WHERE table_id = $1 AND status NOT IN ('delivered', 'cancelled', 'closed') AND id != $2",
            [order[0].table_id, id]
          )
          if (activeOrders.length === 0) {
            await query("UPDATE restaurant_tables SET status = 'available' WHERE id = $1", [order[0].table_id])
          }
        }
      }
    }

    // Handle items update (add/remove items)
    if (items !== undefined) {
      // Verify order is not closed/cancelled/delivered
      const orderCheck = await query("SELECT status FROM orders WHERE id = $1", [id])
      if (orderCheck[0] && ["closed", "cancelled", "delivered"].includes(orderCheck[0].status)) {
        return NextResponse.json({ error: "Impossible de modifier une commande terminee" }, { status: 400 })
      }

      // Delete existing items and recreate
      await query("DELETE FROM order_items WHERE order_id = $1", [id])

      let subtotal = 0
      for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice + (item.optionsTotal || 0)
        subtotal += itemTotal
        await query(
          `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, options_json, options_total, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, item.menuItemId || null, item.itemName, item.quantity, item.unitPrice,
           JSON.stringify(item.options || []), item.optionsTotal || 0, itemTotal]
        )
      }

      // Recalculate order totals
      const settings = await query("SELECT value FROM settings WHERE key = 'tva_rate'")
      const taxRate = settings[0] ? Number(settings[0].value) / 100 : 0.18
      
      // Get current discount or use new one
      const currentOrder = await query("SELECT discount FROM orders WHERE id = $1", [id])
      const discountAmount = discount !== undefined ? Number(discount) : (Number(currentOrder[0]?.discount) || 0)
      const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount)
      const taxAmount = Math.round(subtotalAfterDiscount * taxRate)
      const total = subtotalAfterDiscount + taxAmount

      await query(
        "UPDATE orders SET subtotal = $1, tax_amount = $2, total = $3, discount = $4, updated_at = NOW() WHERE id = $5",
        [subtotal, taxAmount, total, discountAmount, id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
