import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const posId = searchParams.get("posId")
  const unreadOnly = searchParams.get("unreadOnly") === "true"

  try {
    let where = "WHERE 1=1"
    const params: string[] = []
    let idx = 1

    if (posId) {
      where += ` AND n.point_of_sale_id = $${idx}`
      params.push(posId)
      idx++
    }
    if (unreadOnly) {
      where += " AND n.is_read = false"
    }

    const notifications = await query(
      `SELECT n.*, o.order_number
      FROM notifications n
      LEFT JOIN orders o ON o.id = n.related_order_id
      ${where}
      ORDER BY n.created_at DESC
      LIMIT 50`,
      params
    )

    const [countResult] = await query(
      `SELECT COUNT(*) as count FROM notifications n ${where.replace("1=1", "1=1 AND n.is_read = false")}`,
      params
    )

    return NextResponse.json({
      notifications,
      unreadCount: Number(countResult?.count || 0),
    })
  } catch (error) {
    console.error("Notifications error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, markAllRead } = body

    if (markAllRead) {
      await execute("UPDATE notifications SET is_read = true WHERE is_read = false")
      return NextResponse.json({ success: true })
    }

    if (id) {
      await execute("UPDATE notifications SET is_read = true WHERE id = $1", [id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Parametre manquant" }, { status: 400 })
  } catch (error) {
    console.error("Notifications update error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
