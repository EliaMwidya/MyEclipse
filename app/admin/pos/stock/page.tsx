"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Package } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PosStockPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const { data: stock } = useSWR(selectedPos ? `/api/pos/stock?posId=${selectedPos}` : null, fetcher)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Stock POS</h1>
        <Select value={selectedPos} onValueChange={setSelectedPos}>
          <SelectTrigger className="w-[200px] border-border bg-secondary text-foreground"><SelectValue placeholder="Point de vente" /></SelectTrigger>
          <SelectContent className="border-border bg-card text-card-foreground">
            {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedPos ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent></Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categorie</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantite (unites)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prix vente</th>
                  </tr>
                </thead>
                <tbody>
                  {(stock || []).map((s: { product_id: string; product_name: string; category_name: string; quantity_units: number; sale_unit: string; sale_price: number }) => (
                    <tr key={s.product_id} className="border-b border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-card-foreground">{s.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.category_name || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.quantity_units <= 5 ? "destructive" : "default"}>{s.quantity_units} {s.sale_unit}</Badge>
                      </td>
                      <td className="px-4 py-3 text-primary font-medium">{Number(s.sale_price).toLocaleString()} CDF</td>
                    </tr>
                  ))}
                  {stock && stock.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun stock POS</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
