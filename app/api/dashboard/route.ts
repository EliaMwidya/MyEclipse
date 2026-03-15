import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = `${today.slice(0, 7)}-01`

    const [
      todaySalesRow,
      todayOrdersRow,
      totalProductsRow,
      totalUsersRow,
      lowStockRow,
      pendingOrdersRow,
      monthSalesRow,
      totalPOSRow,
      recentOrders,
    ] = await Promise.all([
      queryOne<{ total: string }>("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE created_at::date = $1 AND status != 'cancelled'", [today]),
      queryOne<{ count: string }>("SELECT COUNT(*) as count FROM orders WHERE created_at::date = $1", [today]),
      queryOne<{ count: string }>("SELECT COUNT(*) as count FROM products WHERE is_active = true"),
      queryOne<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE is_active = true"),
      queryOne<{ count: string }>("SELECT COUNT(*) as count FROM warehouse_stock ws JOIN products p ON p.id = ws.product_id WHERE ws.real_qty <= p.low_stock_threshold"),
      queryOne<{ count: string }>("SELECT COUNT(*) as count FROM orders WHERE status IN ('received', 'preparing')"),
      queryOne<{ total: string }>("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE created_at >= $1 AND status != 'cancelled'", [monthStart]),
      queryOne<{ count: string }>("SELECT COUNT(*) as count FROM points_of_sale WHERE is_active = true"),
      query<{ order_number: string; status: string; total: number; created_at: string }>("SELECT order_number, status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 10"),
    ])

    return NextResponse.json({
      todaySales: Number(todaySalesRow?.total ?? 0),
      todayOrders: Number(todayOrdersRow?.count ?? 0),
      totalProducts: Number(totalProductsRow?.count ?? 0),
      totalUsers: Number(totalUsersRow?.count ?? 0),
      lowStock: Number(lowStockRow?.count ?? 0),
      pendingOrders: Number(pendingOrdersRow?.count ?? 0),
      monthSales: Number(monthSalesRow?.total ?? 0),
      totalPOS: Number(totalPOSRow?.count ?? 0),
      recentOrders: recentOrders || [],
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({
      todaySales: 0, todayOrders: 0, totalProducts: 0, totalUsers: 0,
      lowStock: 0, pendingOrders: 0, monthSales: 0, totalPOS: 0, recentOrders: [],
    })
  }
}
