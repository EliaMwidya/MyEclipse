import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const type = searchParams.get("type")
    const posId = searchParams.get("posId")

    // Summary: totals by type
    if (type === "summary") {
      const conditions: string[] = []
      const params: (string | number)[] = []
      let idx = 1
      if (from) { conditions.push(`entry_date >= $${idx}`); params.push(from); idx++ }
      if (to) { conditions.push(`entry_date <= $${idx}`); params.push(to); idx++ }
      if (posId && posId !== "all") { conditions.push(`point_of_sale_id = $${idx}`); params.push(posId); idx++ }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

      const result = await query(
        `SELECT entry_type,
                SUM(debit) as total_debit,
                SUM(credit) as total_credit,
                COUNT(*) as count
         FROM accounting_entries ${where}
         GROUP BY entry_type
         ORDER BY entry_type`,
        params
      )

      // Also get totals
      const totals = await query(
        `SELECT SUM(debit) as total_debit, SUM(credit) as total_credit FROM accounting_entries ${where}`,
        params
      )

      return NextResponse.json({ byType: result, totals: totals[0] || { total_debit: 0, total_credit: 0 } })
    }

    // Detailed journal entries
    const conditions: string[] = []
    const params: (string | number)[] = []
    let idx = 1
    if (from) { conditions.push(`ae.entry_date >= $${idx}`); params.push(from); idx++ }
    if (to) { conditions.push(`ae.entry_date <= $${idx}`); params.push(to); idx++ }
    if (posId && posId !== "all") { conditions.push(`ae.point_of_sale_id = $${idx}`); params.push(posId); idx++ }
    if (type && type !== "all") { conditions.push(`ae.entry_type = $${idx}`); params.push(type); idx++ }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
    const entries = await query(
      `SELECT ae.*, pos.name as pos_name, u.full_name as created_by_name
       FROM accounting_entries ae
       LEFT JOIN points_of_sale pos ON pos.id = ae.point_of_sale_id
       LEFT JOIN users u ON u.id = ae.created_by
       ${where}
       ORDER BY ae.entry_date DESC, ae.created_at DESC
       LIMIT 500`,
      params
    )

    return NextResponse.json(entries)
  } catch (error) { console.error(error); return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { entryDate, description, entryType, debit, credit, pointOfSaleId, reference } = await request.json()
    if (!description || !entryType) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO accounting_entries (entry_date, reference, description, entry_type, debit, credit, point_of_sale_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        entryDate || new Date().toISOString().split("T")[0],
        reference || null,
        description,
        entryType,
        debit || 0,
        credit || 0,
        pointOfSaleId || null,
        session?.id || null,
      ]
    )

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
