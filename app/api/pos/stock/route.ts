import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    if (!posId) return NextResponse.json([])
    const stock = await query(
      `SELECT ps.*, p.name as product_name, p.sale_unit, p.sale_price, p.image_url, c.name as category_name
       FROM pos_stock ps
       JOIN products p ON p.id = ps.product_id
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE ps.point_of_sale_id = $1 AND p.is_active = true
       ORDER BY p.name`,
      [posId]
    )
    return NextResponse.json(stock)
  } catch (error) { console.error(error); return NextResponse.json([]) }
}
