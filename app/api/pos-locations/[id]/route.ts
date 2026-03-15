import { NextResponse } from "next/server"
import { execute } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, address, isActive } = await request.json()
    await execute(
      "UPDATE points_of_sale SET name=$1, address=$2, is_active=$3 WHERE id=$4",
      [name, address, isActive, id]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POS locations PUT error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await execute("DELETE FROM points_of_sale WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POS locations DELETE error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
