"use client"

import React from "react"
import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, ArrowRightLeft, Printer } from "lucide-react"
import { generateExitPDF, openPrintWindow } from "@/lib/pdf-generator"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ExitsPage() {
  const { data: exits, mutate } = useSWR("/api/warehouse/exits", fetcher)
  const { data: products } = useSWR("/api/warehouse/products", fetcher)
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const { data: settings } = useSWR("/api/settings", fetcher)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ productId: "", pointOfSaleId: "", quantityCartons: "", notes: "" })

  const company = {
    name: settings?.restaurant_name || "Eclipse Lunc Bar",
    address: settings?.restaurant_address || "",
    phone: settings?.restaurant_phone || "",
    currency: settings?.currency || "CDF",
    tvaRate: settings?.tva_rate || "18",
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/warehouse/exits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        pointOfSaleId: form.pointOfSaleId,
        quantityCartons: Number(form.quantityCartons),
        notes: form.notes,
      }),
    })
    if (res.ok) {
      toast.success("Sortie enregistree")
      mutate()
      setOpen(false)
      setForm({ productId: "", pointOfSaleId: "", quantityCartons: "", notes: "" })
    } else {
      const data = await res.json()
      toast.error(data.error || "Erreur")
    }
  }

  function handlePrint(exit: { reference: string; product_name: string; pos_name: string; quantity_cartons: number; conversion_rate: number; notes: string; created_by_name: string; created_at: string }) {
    const html = generateExitPDF({
      reference: exit.reference,
      date: new Date(exit.created_at).toLocaleDateString("fr-FR"),
      productName: exit.product_name,
      posName: exit.pos_name || "-",
      quantityCartons: exit.quantity_cartons,
      quantityUnits: exit.quantity_cartons * (exit.conversion_rate || 1),
      notes: exit.notes || undefined,
      createdBy: exit.created_by_name || "-",
      company,
    })
    openPrintWindow(html)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Sorties vers POS</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle sortie
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Nouvelle sortie de stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Produit</Label>
                <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    {(products || []).map((p: { id: string; name: string; warehouse_qty: number }) => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.warehouse_qty || 0})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Point de vente</Label>
                <Select value={form.pointOfSaleId} onValueChange={(v) => setForm({ ...form, pointOfSaleId: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Quantite</Label>
                <Input type="number" value={form.quantityCartons} onChange={(e) => setForm({ ...form, quantityCartons: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Point de vente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantite</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Par</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">PDF</th>
                </tr>
              </thead>
              <tbody>
                {(exits || []).map((ex: { id: string; reference: string; product_name: string; pos_name: string; quantity_cartons: number; conversion_rate: number; created_by_name: string; created_at: string; notes: string }) => (
                  <tr key={ex.id} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="border-primary/30 text-primary">{ex.reference}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-card-foreground">{ex.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ex.pos_name || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-card-foreground">{ex.quantity_cartons} cartons</span>
                      <span className="ml-2 text-xs text-muted-foreground">({ex.quantity_cartons * (ex.conversion_rate || 1)} unites)</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ex.created_by_name || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(ex.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(ex)} className="h-7 w-7 p-0 text-primary">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!exits || exits.length === 0) && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucune sortie</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
