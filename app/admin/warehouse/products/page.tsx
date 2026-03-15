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
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Package } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ProductForm {
  name: string; categoryId: string; storageUnit: string; saleUnit: string
  conversionRate: string; purchasePrice: string; salePrice: string; lowStockThreshold: string; imageUrl: string
}

const emptyForm: ProductForm = {
  name: "", categoryId: "", storageUnit: "carton", saleUnit: "plat",
  conversionRate: "1", purchasePrice: "0", salePrice: "0", lowStockThreshold: "5", imageUrl: "",
}

export default function ProductsPage() {
  const { data: products, mutate } = useSWR("/api/warehouse/products", fetcher)
  const { data: categories } = useSWR("/api/warehouse/categories", fetcher)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/warehouse/products/${editId}` : "/api/warehouse/products"
    const method = editId ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        conversionRate: Number(form.conversionRate),
        purchasePrice: Number(form.purchasePrice),
        salePrice: Number(form.salePrice),
        lowStockThreshold: Number(form.lowStockThreshold),
        isActive: true,
      }),
    })
    if (res.ok) {
      toast.success(editId ? "Produit modifie" : "Produit cree")
      mutate()
      setOpen(false)
      setForm(emptyForm)
      setEditId(null)
    } else {
      const data = await res.json()
      toast.error(data.error || "Erreur")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Desactiver ce produit ?")) return
    const res = await fetch(`/api/warehouse/products/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Produit desactive"); mutate() }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Produits</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm) } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto border-border bg-card text-card-foreground">
            <DialogHeader><DialogTitle className="text-card-foreground">{editId ? "Modifier" : "Nouveau"} produit</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Categorie</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    {(categories || []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Unite stockage</Label>
                  <Input value={form.storageUnit} onChange={(e) => setForm({ ...form, storageUnit: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Unite vente</Label>
                  <Input value={form.saleUnit} onChange={(e) => setForm({ ...form, saleUnit: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Taux conversion (1 {form.storageUnit} = X {form.saleUnit})</Label>
                <Input type="number" value={form.conversionRate} onChange={(e) => setForm({ ...form, conversionRate: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Prix achat</Label>
                  <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Prix vente</Label>
                  <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Seuil stock bas</Label>
                <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">URL Image</Label>
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="border-border bg-secondary text-foreground" placeholder="https://..." />
              </div>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{editId ? "Modifier" : "Creer"}</Button>
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categorie</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conversion</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prix achat</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prix vente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(products || []).map((p: { id: string; name: string; category_name: string; storage_unit: string; sale_unit: string; conversion_rate: number; purchase_price: number; sale_price: number; warehouse_qty: number; low_stock_threshold: number; is_active: boolean; category_id: string; image_url: string }) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-card-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category_name || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">1 {p.storage_unit} = {p.conversion_rate} {p.sale_unit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.purchase_price} CDF</td>
                    <td className="px-4 py-3 text-card-foreground">{p.sale_price} CDF</td>
                    <td className="px-4 py-3">
                      <Badge variant={Number(p.warehouse_qty) <= p.low_stock_threshold ? "destructive" : "default"}>
                        {p.warehouse_qty} {p.storage_unit}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditId(p.id)
                          setForm({
                            name: p.name, categoryId: p.category_id || "", storageUnit: p.storage_unit,
                            saleUnit: p.sale_unit, conversionRate: String(p.conversion_rate),
                            purchasePrice: String(p.purchase_price), salePrice: String(p.sale_price),
                            lowStockThreshold: String(p.low_stock_threshold), imageUrl: p.image_url || "",
                          })
                          setOpen(true)
                        }} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
