import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "daily"
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const posId = searchParams.get("posId")

  try {
    let dateFilter = ""
    const params: (string | null)[] = []
    let paramIdx = 1

    if (from) {
      dateFilter += ` AND o.created_at >= $${paramIdx}::date`
      params.push(from)
      paramIdx++
    }
    if (to) {
      dateFilter += ` AND o.created_at <= ($${paramIdx}::date + interval '1 day')`
      params.push(to)
      paramIdx++
    }

    let posFilter = ""
    if (posId) {
      posFilter = ` AND o.point_of_sale_id = $${paramIdx}`
      params.push(posId)
      paramIdx++
    }

    if (type === "daily") {
      const sales = await query(
        `SELECT
          DATE(o.created_at) as date,
          COUNT(*) as total_orders,
          COALESCE(SUM(o.total), 0) as total_sales,
          COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount_cash ELSE 0 END), 0) as cash_sales,
          COALESCE(SUM(CASE WHEN p.payment_method = 'mobile_money' THEN p.amount_mobile ELSE 0 END), 0) as mobile_sales,
          COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount_card ELSE 0 END), 0) as card_sales
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.status != 'cancelled'${dateFilter}${posFilter}
        GROUP BY DATE(o.created_at)
        ORDER BY date DESC
        LIMIT 30`,
        params
      )
      return NextResponse.json({ sales })
    }

    if (type === "products") {
      const products = await query(
        `SELECT
          oi.item_name,
          SUM(oi.quantity) as total_qty,
          SUM(oi.total) as total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'${dateFilter}${posFilter}
        GROUP BY oi.item_name
        ORDER BY total_qty DESC
        LIMIT 20`,
        params
      )
      return NextResponse.json({ products })
    }

    if (type === "expenses") {
      const expenses = await query(
        `SELECT
          category,
          COUNT(*) as count,
          SUM(amount) as total
        FROM expenses
        WHERE 1=1 ${from ? `AND created_at >= $1::date` : ""} ${to ? `AND created_at <= ($${from ? "2" : "1"}::date + interval '1 day')` : ""}
        GROUP BY category
        ORDER BY total DESC`,
        [from, to].filter(Boolean)
      )
      return NextResponse.json({ expenses })
    }

    if (type === "summary") {
      const [totalSales] = await query(
        `SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as order_count
        FROM orders
        WHERE status != 'cancelled'${dateFilter}${posFilter}`,
        params
      )
      const [totalExpenses] = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
        WHERE 1=1 ${from ? `AND created_at >= $1::date` : ""} ${to ? `AND created_at <= ($${from ? "2" : "1"}::date + interval '1 day')` : ""}`,
        [from, to].filter(Boolean)
      )
      const topItems = await query(
        `SELECT oi.item_name, SUM(oi.quantity) as qty, SUM(oi.total) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'${dateFilter}${posFilter}
        GROUP BY oi.item_name
        ORDER BY qty DESC LIMIT 5`,
        params
      )
      const hourlyDistribution = await query(
        `SELECT
          EXTRACT(HOUR FROM o.created_at) as hour,
          COUNT(*) as orders,
          COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        WHERE o.status != 'cancelled'${dateFilter}${posFilter}
        GROUP BY EXTRACT(HOUR FROM o.created_at)
        ORDER BY hour`,
        params
      )

      return NextResponse.json({
        totalSales: totalSales?.total || 0,
        orderCount: totalSales?.order_count || 0,
        totalExpenses: totalExpenses?.total || 0,
        profit: Number(totalSales?.total || 0) - Number(totalExpenses?.total || 0),
        topItems,
        hourlyDistribution,
      })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
