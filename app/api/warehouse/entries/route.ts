import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateRef } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const entries = await query(
      `SELECT se.*, p.name as product_name, s.name as supplier_name, u.full_name as created_by_name
       FROM supply_entries se
       LEFT JOIN products p ON p.id = se.product_id
       LEFT JOIN suppliers s ON s.id = se.supplier_id
       LEFT JOIN users u ON u.id = se.created_by
       ORDER BY se.created_at DESC`
    )
    return NextResponse.json(entries)
  } catch (error) {
    console.error(error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const { productId, supplierId, quantityCartons, unitCost, notes } = await request.json()
    if (!productId || !quantityCartons || !unitCost) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
    }
    const reference = generateRef("APP")
    const totalCost = quantityCartons * unitCost

    const result = await query(
      `INSERT INTO supply_entries (reference, supplier_id, product_id, quantity_cartons, unit_cost, total_cost, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [reference, supplierId || null, productId, quantityCartons, unitCost, totalCost, notes || "", session?.id || null]
    )

    // Update warehouse stock
    await query(
      `INSERT INTO warehouse_stock (product_id, theoretical_qty, real_qty)
       VALUES ($1, $2, $2)
       ON CONFLICT (product_id)
       DO UPDATE SET theoretical_qty = warehouse_stock.theoretical_qty + $2,
                     real_qty = warehouse_stock.real_qty + $2,
                     updated_at = NOW()`,
      [productId, quantityCartons]
    )

    // Record in accounting
    await query(
      `INSERT INTO accounting_entries (entry_date, reference, description, entry_type, debit, credit, created_by)
       VALUES (CURRENT_DATE, $1, $2, 'supply', $3, 0, $4)`,
      [reference, `Approvisionnement ${reference}`, totalCost, session?.id || null]
    ).catch(() => {})

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
