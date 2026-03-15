import { NextResponse } from "next/server"
import { query, execute, generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const posId = searchParams.get("posId")

  try {
    let where = "WHERE 1=1"
    const params: string[] = []
    let idx = 1

    if (posId) {
      where += ` AND e.point_of_sale_id = $${idx}`
      params.push(posId)
      idx++
    }

    const expenses = await query(
      `SELECT e.*, u.full_name as created_by_name, pos.name as pos_name
      FROM expenses e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN points_of_sale pos ON pos.id = e.point_of_sale_id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT 100`,
      params
    )
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Expenses GET error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    const body = await req.json()
    const { pointOfSaleId, category, description, amount } = body

    if (!category || !amount) {
      return NextResponse.json({ error: "Categorie et montant requis" }, { status: 400 })
    }

    const [expense] = await query(
      `INSERT INTO expenses (point_of_sale_id, category, description, amount, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [pointOfSaleId || null, category, description || "", amount, session?.id || null]
    )

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Expenses POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
