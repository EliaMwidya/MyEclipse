import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    const status = searchParams.get("status")
    
    let sql = `
      SELECT c.*, o.order_number, o.total as order_total,
             pos.name as point_of_sale_name,
             u.full_name as created_by_name
      FROM credits c
      JOIN orders o ON o.id = c.order_id
      LEFT JOIN pos_locations pos ON pos.id = c.point_of_sale_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE 1=1
    `
    const params: string[] = []
    let paramIndex = 1

    if (posId) {
      sql += ` AND c.point_of_sale_id = $${paramIndex}`
      params.push(posId)
      paramIndex++
    }

    if (status) {
      sql += ` AND c.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    sql += " ORDER BY c.created_at DESC LIMIT 200"
    
    return NextResponse.json(await query(sql, params))
  } catch (error) {
    console.error("Credits GET error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { orderId, clientName, clientPhone, dueDate, notes } = await request.json()

    if (!orderId || !clientName) {
      return NextResponse.json({ error: "Commande et nom client requis" }, { status: 400 })
    }

    // Get order details
    const orderResult = await query("SELECT * FROM orders WHERE id = $1", [orderId])
    if (!orderResult[0]) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    }

    const order = orderResult[0]
    const creditRef = generateRef("CRED")

    // Create credit record
    const result = await query(
      `INSERT INTO credits (order_id, point_of_sale_id, credit_reference, client_name, client_phone, total_amount, remaining_amount, due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [orderId, order.point_of_sale_id, creditRef, clientName, clientPhone || null, Number(order.total), Number(order.total), dueDate || null, notes || null, session?.id || null]
    )

    // Update order status to indicate it's a credit sale
    await query("UPDATE orders SET status = 'credit', updated_at = NOW() WHERE id = $1", [orderId])

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Credits POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
