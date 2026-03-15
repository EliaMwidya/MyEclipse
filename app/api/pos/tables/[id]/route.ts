import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { tableNumber, capacity, status } = await request.json()
    await query("UPDATE restaurant_tables SET table_number=$1, capacity=$2, status=$3 WHERE id=$4", [tableNumber, capacity, status, id])
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await execute("DELETE FROM restaurant_tables WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur" }, { status: 500 }) }
}
