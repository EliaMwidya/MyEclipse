import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const posId = searchParams.get("posId")
    const tableId = searchParams.get("tableId")

    if (!posId) return NextResponse.json({ error: "POS requis" }, { status: 400 })

    const categories = await query(
      "SELECT * FROM menu_categories WHERE is_active = true ORDER BY sort_order, name"
    )

    const items = await query(
      `SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url, mi.category_id, mc.name as category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.point_of_sale_id = $1 AND mi.is_available = true
       ORDER BY mc.sort_order, mi.name`,
      [posId]
    )

    const settings = await query("SELECT key, value FROM settings WHERE key IN ('restaurant_name', 'tva_rate', 'currency')")
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => { settingsMap[s.key as string] = s.value as string })

    return NextResponse.json({ categories, items, settings: settingsMap })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
