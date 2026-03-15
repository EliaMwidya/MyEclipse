import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const products = await query(
      `SELECT p.*, c.name as category_name, 
              COALESCE(ws.real_qty, 0) as warehouse_qty
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN warehouse_stock ws ON ws.product_id = p.id
       ORDER BY p.name`
    )
    return NextResponse.json(products)
  } catch (error) {
    console.error("Products GET error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, categoryId, storageUnit, saleUnit, conversionRate, purchasePrice, salePrice, lowStockThreshold, imageUrl } = body
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    const result = await query(
      `INSERT INTO products (name, category_id, storage_unit, sale_unit, conversion_rate, purchase_price, sale_price, low_stock_threshold, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, categoryId || null, storageUnit || "carton", saleUnit || "plat", conversionRate || 1, purchasePrice || 0, salePrice || 0, lowStockThreshold || 5, imageUrl || null]
    )
    // Create warehouse stock entry
    await query("INSERT INTO warehouse_stock (product_id, theoretical_qty, real_qty) VALUES ($1, 0, 0) ON CONFLICT (product_id) DO NOTHING", [result[0].id])
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Products POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
