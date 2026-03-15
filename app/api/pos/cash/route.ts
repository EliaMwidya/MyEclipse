import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    let sql = `SELECT cs.*, pos.name as pos_name, u1.full_name as opened_by_name, u2.full_name as closed_by_name
               FROM cash_sessions cs
               LEFT JOIN points_of_sale pos ON pos.id = cs.point_of_sale_id
               LEFT JOIN users u1 ON u1.id = cs.opened_by
               LEFT JOIN users u2 ON u2.id = cs.closed_by`
    const params: string[] = []
    if (posId) { sql += " WHERE cs.point_of_sale_id = $1"; params.push(posId) }
    sql += " ORDER BY cs.opened_at DESC LIMIT 50"
    return NextResponse.json(await query(sql, params))
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { pointOfSaleId, action, openingAmount, closingAmount, sessionId } = await request.json()

    if (action === "open") {
      // Check if there's already an open session
      const existing = await queryOne("SELECT id FROM cash_sessions WHERE point_of_sale_id = $1 AND status = 'open'", [pointOfSaleId])
      if (existing) return NextResponse.json({ error: "Une caisse est deja ouverte pour ce POS" }, { status: 400 })

      const result = await query(
        "INSERT INTO cash_sessions (point_of_sale_id, opened_by, opening_amount) VALUES ($1, $2, $3) RETURNING *",
        [pointOfSaleId, session?.id || null, openingAmount || 0]
      )
      return NextResponse.json(result[0], { status: 201 })
    }

    if (action === "close") {
      if (!sessionId) return NextResponse.json({ error: "Session ID requis" }, { status: 400 })
      await query(
        "UPDATE cash_sessions SET status = 'closed', closed_by = $1, closing_amount = $2, closed_at = NOW() WHERE id = $3",
        [session?.id || null, closingAmount || 0, sessionId]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
