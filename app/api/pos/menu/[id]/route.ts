import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { categoryId, productId, name, description, price, imageUrl, isAvailable } = await request.json()
    await query(
      `UPDATE menu_items SET category_id=$1, product_id=$2, name=$3, description=$4, price=$5, image_url=$6, is_available=$7, updated_at=NOW() WHERE id=$8`,
      [categoryId || null, productId || null, name, description, price, imageUrl, isAvailable, id]
    )
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await execute("DELETE FROM menu_items WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
