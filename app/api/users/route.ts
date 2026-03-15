import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get("role")

    let sql = `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.point_of_sale_id,
              p.name as pos_name, u.created_at
       FROM users u
       LEFT JOIN points_of_sale p ON p.id = u.point_of_sale_id`
    const params: string[] = []

    if (roleFilter) {
      const roles = roleFilter.split(",").map(r => r.trim())
      const placeholders = roles.map((_, i) => `$${i + 1}`).join(", ")
      sql += ` WHERE u.role IN (${placeholders}) AND u.is_active = true`
      params.push(...roles)
    }

    sql += " ORDER BY u.created_at DESC"
    const users = await query(sql, params)
    return NextResponse.json(users)
  } catch (error) {
    console.error("Users GET error:", error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role, pointOfSaleId } = await request.json()
    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
    }
    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email])
    if (existing) {
      return NextResponse.json({ error: "Cet email est deja utilise" }, { status: 409 })
    }
    const passwordHash = hashPassword(password)
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, point_of_sale_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role`,
      [email, passwordHash, fullName, role, pointOfSaleId || null]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Users POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
