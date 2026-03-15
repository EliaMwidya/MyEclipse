import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    const sessionId = searchParams.get("sessionId")
    let sql = `SELECT cw.*, pos.name as pos_name, u.full_name as created_by_name
               FROM cash_withdrawals cw
               LEFT JOIN points_of_sale pos ON pos.id = cw.point_of_sale_id
               LEFT JOIN users u ON u.id = cw.created_by`
    const params: string[] = []
    const conditions: string[] = []
    if (posId) { conditions.push(`cw.point_of_sale_id = $${conditions.length + 1}`); params.push(posId) }
    if (sessionId) { conditions.push(`cw.cash_session_id = $${conditions.length + 1}`); params.push(sessionId) }
    if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`
    sql += " ORDER BY cw.created_at DESC LIMIT 100"
    return NextResponse.json(await query(sql, params))
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { pointOfSaleId, amount, reason } = await request.json()
    if (!pointOfSaleId || !amount || !reason) {
      return NextResponse.json({ error: "Champs requis: pointOfSaleId, amount, reason" }, { status: 400 })
    }

    // Find open cash session
    const cashSession = await queryOne(
      "SELECT id FROM cash_sessions WHERE point_of_sale_id = $1 AND status = 'open'",
      [pointOfSaleId]
    )
    if (!cashSession) {
      return NextResponse.json({ error: "Aucune caisse ouverte pour ce POS" }, { status: 400 })
    }

    const reference = generateRef("RET")

    const result = await query(
      `INSERT INTO cash_withdrawals (reference, cash_session_id, point_of_sale_id, amount, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [reference, cashSession.id, pointOfSaleId, amount, reason, session?.id || null]
    )

    // Update cash session total_cash
    await query(
      "UPDATE cash_sessions SET total_cash = total_cash - $1 WHERE id = $2",
      [amount, cashSession.id]
    )

    // Record in accounting
    await query(
      `INSERT INTO accounting_entries (entry_date, reference, description, entry_type, debit, credit, point_of_sale_id, related_id, created_by)
       VALUES (CURRENT_DATE, $1, $2, 'withdrawal', $3, 0, $4, $5, $6)`,
      [reference, `Retrait caisse: ${reason}`, amount, pointOfSaleId, result[0].id, session?.id || null]
    )

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
