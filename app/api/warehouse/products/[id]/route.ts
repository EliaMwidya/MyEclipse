import { NextResponse } from "next/server"
import { execute } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, categoryId, storageUnit, saleUnit, conversionRate, purchasePrice, salePrice, lowStockThreshold, imageUrl, isActive } = await request.json()
    await execute(
      `UPDATE products SET name=$1, category_id=$2, storage_unit=$3, sale_unit=$4, conversion_rate=$5,
       purchase_price=$6, sale_price=$7, low_stock_threshold=$8, image_url=$9, is_active=$10, updated_at=NOW()
       WHERE id=$11`,
      [name, categoryId || null, storageUnit, saleUnit, conversionRate, purchasePrice, salePrice, lowStockThreshold, imageUrl || null, isActive ?? true, id]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await execute("UPDATE products SET is_active = false WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
