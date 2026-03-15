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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, UtensilsCrossed } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface MenuForm {
  categoryId: string; productId: string; name: string; description: string
  price: string; imageUrl: string; isAvailable: boolean; pointOfSaleId: string
}
const emptyForm: MenuForm = {
  categoryId: "", productId: "", name: "", description: "",
  price: "0", imageUrl: "", isAvailable: true, pointOfSaleId: "",
}

export default function MenuPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const { data: menuItems, mutate } = useSWR(selectedPos ? `/api/pos/menu?posId=${selectedPos}` : null, fetcher)
  const { data: menuCategories } = useSWR("/api/pos/menu-categories", fetcher)
  const { data: products } = useSWR("/api/warehouse/products", fetcher)
  const [form, setForm] = useState<MenuForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [catName, setCatName] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/pos/menu/${editId}` : "/api/pos/menu"
    const method = editId ? "PUT" : "POST"
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), pointOfSaleId: selectedPos }),
    })
    if (res.ok) {
      toast.success(editId ? "Menu modifie" : "Article ajoute")
      mutate(); setOpen(false); setForm(emptyForm); setEditId(null)
    } else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet article du menu ?")) return
    const res = await fetch(`/api/pos/menu/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Supprime"); mutate() }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/pos/menu-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName }),
    })
    if (res.ok) { toast.success("Categorie creee"); setCatOpen(false); setCatName("") }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Menu</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedPos} onValueChange={setSelectedPos}>
            <SelectTrigger className="w-[200px] border-border bg-secondary text-foreground">
              <SelectValue placeholder="Point de vente" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-card-foreground">
              {(locations || []).map((l: { id: string; name: string }) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild><Button variant="outline" className="border-border text-foreground bg-transparent">Cat.</Button></DialogTrigger>
            <DialogContent className="border-border bg-card text-card-foreground">
              <DialogHeader><DialogTitle className="text-card-foreground">Nouvelle categorie menu</DialogTitle></DialogHeader>
              <form onSubmit={handleAddCategory} className="flex flex-col gap-3">
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nom" required className="border-border bg-secondary text-foreground" />
                <Button type="submit" className="bg-primary text-primary-foreground">Creer</Button>
              </form>
            </DialogContent>
          </Dialog>
          {selectedPos && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm) } }}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto border-border bg-card text-card-foreground">
                <DialogHeader><DialogTitle className="text-card-foreground">{editId ? "Modifier" : "Nouvel"} article</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Nom</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-border bg-secondary text-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Categorie menu</Label>
                    <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                      <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        {(menuCategories || []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Produit lie (optionnel)</Label>
                    <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                      <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        {(products || []).map((p: { id: string; name: string }) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border bg-secondary text-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Prix (CDF)</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="border-border bg-secondary text-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">URL Image</Label>
                    <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="border-border bg-secondary text-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} />
                    <Label className="text-card-foreground">Disponible</Label>
                  </div>
                  <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{editId ? "Modifier" : "Creer"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedPos ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(menuItems || []).map((item: { id: string; name: string; description: string; price: number; category_name: string; is_available: boolean; image_url: string; category_id: string; product_id: string }) => (
            <Card key={item.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <UtensilsCrossed className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-card-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.category_name || "Sans categorie"}</p>
                    </div>
                  </div>
                  <Badge variant={item.is_available ? "default" : "destructive"}>
                    {item.is_available ? "Disponible" : "Indisponible"}
                  </Badge>
                </div>
                {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{Number(item.price).toLocaleString()} CDF</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditId(item.id)
                      setForm({ categoryId: item.category_id || "", productId: item.product_id || "", name: item.name, description: item.description || "", price: String(item.price), imageUrl: item.image_url || "", isAvailable: item.is_available, pointOfSaleId: selectedPos })
                      setOpen(true)
                    }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {menuItems && menuItems.length === 0 && (
            <Card className="col-span-full border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Aucun article dans le menu</CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}
