"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AlertTriangle, Package, ClipboardList } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function WarehouseStockPage() {
  const { data: stock, mutate } = useSWR("/api/warehouse/stock", fetcher)
  const [adjusting, setAdjusting] = useState<{ productId: string; name: string; currentQty: number } | null>(null)
  const [newQty, setNewQty] = useState("")
  const [reason, setReason] = useState("")

  const lowStockItems = (stock || []).filter((s: { real_qty: number; low_stock_threshold: number }) => s.real_qty <= s.low_stock_threshold)

  async function handleAdjust() {
    if (!adjusting) return
    const res = await fetch("/api/warehouse/stock", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: adjusting.productId, newQty: Number(newQty), reason }),
    })
    if (res.ok) {
      toast.success("Stock ajuste")
      mutate()
      setAdjusting(null)
      setNewQty("")
      setReason("")
    } else {
      toast.error("Erreur")
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Stock Entrepot</h1>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Alertes stock bas ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((s: { product_id: string; product_name: string; real_qty: number; storage_unit: string }) => (
                <Badge key={s.product_id} variant="destructive">
                  {s.product_name}: {s.real_qty} {s.storage_unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categorie</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock theorique</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock reel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ecart</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seuil</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(stock || []).map((s: { product_id: string; product_name: string; category_name: string; storage_unit: string; theoretical_qty: number; real_qty: number; low_stock_threshold: number }) => {
                  const diff = s.real_qty - s.theoretical_qty
                  const isLow = s.real_qty <= s.low_stock_threshold
                  return (
                    <tr key={s.product_id} className="border-b border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-card-foreground">{s.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.category_name || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.theoretical_qty} {s.storage_unit}</td>
                      <td className="px-4 py-3">
                        <Badge variant={isLow ? "destructive" : "default"}>{s.real_qty} {s.storage_unit}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {diff !== 0 ? (
                          <span className={diff > 0 ? "text-success" : "text-destructive"}>{diff > 0 ? "+" : ""}{diff}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.low_stock_threshold}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setAdjusting({ productId: s.product_id, name: s.product_name, currentQty: s.real_qty })
                          setNewQty(String(s.real_qty))
                        }} className="text-muted-foreground hover:text-foreground">
                          <ClipboardList className="mr-1 h-4 w-4" /> Ajuster
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {(!stock || stock.length === 0) && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun stock</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!adjusting} onOpenChange={(v) => { if (!v) setAdjusting(null) }}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Ajuster le stock: {adjusting?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Stock actuel: {adjusting?.currentQty}</p>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Nouvelle quantite</Label>
              <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Motif</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="border-border bg-secondary text-foreground" placeholder="Inventaire, casse, etc." />
            </div>
            <Button onClick={handleAdjust} className="bg-primary text-primary-foreground hover:bg-primary/90">Confirmer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
