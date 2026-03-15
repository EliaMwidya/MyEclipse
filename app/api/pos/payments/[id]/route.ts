import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payment = await query(
      `SELECT p.*,
              o.order_number, o.subtotal, o.tax_amount, o.total as order_total,
              o.client_name, o.order_type, o.notes as order_notes,
              t.table_number,
              u_cashier.full_name as cashier_name,
              u_waiter.full_name as waiter_name
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN restaurant_tables t ON t.id = o.table_id
       LEFT JOIN users u_cashier ON u_cashier.id = p.created_by
       LEFT JOIN users u_waiter ON u_waiter.id = o.created_by
       WHERE p.id = $1`,
      [id]
    )
    if (!payment[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Get order items
    const items = await query(
      "SELECT item_name, quantity, unit_price, total FROM order_items WHERE order_id = $1",
      [payment[0].order_id]
    )

    // Get company settings
    const settings = await query("SELECT key, value FROM settings WHERE key IN ('restaurant_name', 'restaurant_address', 'restaurant_phone', 'currency', 'tva_rate')")
    const company: Record<string, string> = {}
    for (const s of settings) {
      company[s.key] = s.value
    }

    return NextResponse.json({ ...payment[0], items, company })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
