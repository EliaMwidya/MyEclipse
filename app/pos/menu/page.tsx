"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UtensilsCrossed } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PosMenuViewPage() {
  const { data: session } = useSWR("/api/auth/session", fetcher)
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [posId, setPosId] = useState("")

  useEffect(() => {
    if (session?.user?.point_of_sale_id) setPosId(session.user.point_of_sale_id)
    else if (locations?.length === 1) setPosId(locations[0].id)
  }, [session, locations])

  const { data: menuItems } = useSWR(posId ? `/api/pos/menu?posId=${posId}` : null, fetcher)
  const { data: categories } = useSWR(posId ? `/api/pos/menu-categories?posId=${posId}` : null, fetcher)
  const [selectedCat, setSelectedCat] = useState("all")

  const filtered = (menuItems || []).filter((m: { category_id: string; is_available: boolean }) => {
    if (selectedCat === "all") return true
    return m.category_id === selectedCat
  })

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Menu</h1>
        <div className="flex items-center gap-3">
          {!session?.user?.point_of_sale_id && locations?.length > 1 && (
            <Select value={posId} onValueChange={setPosId}>
              <SelectTrigger className="w-[180px] border-border bg-secondary text-foreground"><SelectValue placeholder="Point de vente" /></SelectTrigger>
              <SelectContent className="border-border bg-card text-card-foreground">
                {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedCat} onValueChange={setSelectedCat}>
            <SelectTrigger className="w-[160px] border-border bg-secondary text-foreground"><SelectValue placeholder="Categorie" /></SelectTrigger>
            <SelectContent className="border-border bg-card text-card-foreground">
              <SelectItem value="all">Toutes</SelectItem>
              {(categories || []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!posId ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item: { id: string; name: string; price: number; description: string; is_available: boolean; category_name: string; image_url: string }) => (
            <Card key={item.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-card-foreground">{item.name}</h3>
                {item.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{Number(item.price).toLocaleString()} CDF</span>
                  <Badge variant={item.is_available ? "default" : "secondary"} className={item.is_available ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                    {item.is_available ? "Disponible" : "Indisponible"}
                  </Badge>
                </div>
                {item.category_name && <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{item.category_name}</p>}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Aucun article</CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}
