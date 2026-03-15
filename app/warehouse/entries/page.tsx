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
import { Plus, Warehouse, Printer } from "lucide-react"
import { generateEntryPDF, openPrintWindow } from "@/lib/pdf-generator"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function EntriesPage() {
  const { data: entries, mutate } = useSWR("/api/warehouse/entries", fetcher)
  const { data: products } = useSWR("/api/warehouse/products", fetcher)
  const { data: suppliers } = useSWR("/api/warehouse/suppliers", fetcher)
  const { data: settings } = useSWR("/api/settings", fetcher)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ productId: "", supplierId: "", quantityCartons: "", unitCost: "", notes: "" })

  const company = {
    name: settings?.restaurant_name || "Eclipse Lunc Bar",
    address: settings?.restaurant_address || "",
    phone: settings?.restaurant_phone || "",
    currency: settings?.currency || "CDF",
    tvaRate: settings?.tva_rate || "18",
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/warehouse/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        supplierId: form.supplierId || null,
        quantityCartons: Number(form.quantityCartons),
        unitCost: Number(form.unitCost),
        notes: form.notes,
      }),
    })
    if (res.ok) {
      toast.success("Approvisionnement enregistre")
      mutate()
      setOpen(false)
      setForm({ productId: "", supplierId: "", quantityCartons: "", unitCost: "", notes: "" })
    } else {
      const data = await res.json()
      toast.error(data.error || "Erreur")
    }
  }

  function handlePrint(entry: { reference: string; product_name: string; supplier_name: string; quantity_cartons: number; unit_cost: number; total_cost: number; notes: string; created_by_name: string; created_at: string }) {
    const html = generateEntryPDF({
      reference: entry.reference,
      date: new Date(entry.created_at).toLocaleDateString("fr-FR"),
      productName: entry.product_name,
      supplierName: entry.supplier_name || "-",
      quantityCartons: entry.quantity_cartons,
      unitCost: Number(entry.unit_cost),
      totalCost: Number(entry.total_cost),
      notes: entry.notes || undefined,
      createdBy: entry.created_by_name || "-",
      company,
    })
    openPrintWindow(html)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Approvisionnements</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Nouveau
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Nouvel approvisionnement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Produit</Label>
                <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    {(products || []).map((p: { id: string; name: string }) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Fournisseur</Label>
                <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    {(suppliers || []).map((s: { id: string; name: string }) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Quantite</Label>
                  <Input type="number" value={form.quantityCartons} onChange={(e) => setForm({ ...form, quantityCartons: e.target.value })} required className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Cout unitaire (CDF)</Label>
                  <Input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} required className="border-border bg-secondary text-foreground" />
                </div>
              </div>
              {form.quantityCartons && form.unitCost && (
                <p className="text-sm text-primary">Total: {(Number(form.quantityCartons) * Number(form.unitCost)).toLocaleString()} CDF</p>
              )}
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fournisseur</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantite</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cout total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Par</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">PDF</th>
                </tr>
              </thead>
              <tbody>
                {(entries || []).map((e: { id: string; reference: string; product_name: string; supplier_name: string; quantity_cartons: number; unit_cost: number; total_cost: number; created_by_name: string; created_at: string; notes: string }) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="border-primary/30 text-primary">{e.reference}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-card-foreground">{e.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.supplier_name || "-"}</td>
                    <td className="px-4 py-3 text-card-foreground">{e.quantity_cartons} cartons</td>
                    <td className="px-4 py-3 font-medium text-primary">{Number(e.total_cost).toLocaleString()} CDF</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.created_by_name || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(e)} className="h-7 w-7 p-0 text-primary">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!entries || entries.length === 0) && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucun approvisionnement</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
