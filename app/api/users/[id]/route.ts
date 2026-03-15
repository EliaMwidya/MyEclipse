import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { email, fullName, role, pointOfSaleId, isActive, password } = await request.json()

    if (password) {
      const passwordHash = hashPassword(password)
      await execute(
        `UPDATE users SET email=$1, full_name=$2, role=$3, point_of_sale_id=$4, is_active=$5, password_hash=$6, updated_at=NOW() WHERE id=$7`,
        [email, fullName, role, pointOfSaleId || null, isActive, passwordHash, id]
      )
    } else {
      await execute(
        `UPDATE users SET email=$1, full_name=$2, role=$3, point_of_sale_id=$4, is_active=$5, updated_at=NOW() WHERE id=$6`,
        [email, fullName, role, pointOfSaleId || null, isActive, id]
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Users PUT error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await execute("UPDATE users SET is_active = false WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Users DELETE error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
