import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const payments = await query(
      `SELECT cp.*, u.full_name as received_by_name
       FROM credit_payments cp
       LEFT JOIN users u ON u.id = cp.received_by
       WHERE cp.credit_id = $1
       ORDER BY cp.created_at DESC`,
      [id]
    )
    
    return NextResponse.json(payments)
  } catch (error) {
    console.error("Credit payments GET error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const { id } = await params
    const { amount, paymentMethod, notes } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }

    // Get credit details
    const creditResult = await query("SELECT * FROM credits WHERE id = $1", [id])
    if (!creditResult[0]) {
      return NextResponse.json({ error: "Credit introuvable" }, { status: 404 })
    }

    const credit = creditResult[0]
    const paymentRef = generateRef("CPAY")
    const actualAmount = Math.min(amount, Number(credit.remaining_amount))

    // Create payment record
    const result = await query(
      `INSERT INTO credit_payments (credit_id, payment_reference, amount, payment_method, notes, received_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, paymentRef, actualAmount, paymentMethod || 'cash', notes || null, session?.id || null]
    )

    // Update credit remaining amount
    const newRemaining = Number(credit.remaining_amount) - actualAmount
    const newStatus = newRemaining <= 0 ? 'paid' : 'partial'

    await query(
      `UPDATE credits SET remaining_amount = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [Math.max(0, newRemaining), newStatus, id]
    )

    // If fully paid, update order status
    if (newRemaining <= 0) {
      await query("UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1", [credit.order_id])
    }

    // Update cash session if open
    const cashSession = await query(
      "SELECT id FROM cash_sessions WHERE status = 'open' AND point_of_sale_id = $1",
      [credit.point_of_sale_id]
    )
    if (cashSession[0]) {
      const cashAmount = paymentMethod === 'cash' ? actualAmount : 0
      const mobileAmount = paymentMethod === 'mobile_money' ? actualAmount : 0
      const cardAmount = paymentMethod === 'card' ? actualAmount : 0
      
      await query(
        `UPDATE cash_sessions SET total_sales = total_sales + $1, total_cash = total_cash + $2,
         total_mobile = total_mobile + $3, total_card = total_card + $4 WHERE id = $5`,
        [actualAmount, cashAmount, mobileAmount, cardAmount, cashSession[0].id]
      )
    }

    return NextResponse.json({ ...result[0], new_remaining: Math.max(0, newRemaining), new_status: newStatus }, { status: 201 })
  } catch (error) {
    console.error("Credit payment POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
