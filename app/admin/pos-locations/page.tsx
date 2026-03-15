"use client"

import React from "react"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Store } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function POSLocationsPage() {
  const { data: locations, mutate } = useSWR("/api/pos-locations", fetcher)
  const [form, setForm] = useState({ name: "", address: "" })
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/pos-locations/${editId}` : "/api/pos-locations"
    const method = editId ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isActive: true }),
    })
    if (res.ok) {
      toast.success(editId ? "Point de vente modifie" : "Point de vente cree")
      mutate()
      setOpen(false)
      setForm({ name: "", address: "" })
      setEditId(null)
    } else {
      toast.error("Erreur")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce point de vente ?")) return
    const res = await fetch(`/api/pos-locations/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Supprime")
      mutate()
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Points de vente</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm({ name: "", address: "" }) } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader><DialogTitle className="text-card-foreground">{editId ? "Modifier" : "Nouveau"} point de vente</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{editId ? "Modifier" : "Creer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(locations || []).map((loc: { id: string; name: string; address: string; is_active: boolean }) => (
          <Card key={loc.id} className="border-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{loc.name}</p>
                  <p className="text-xs text-muted-foreground">{loc.address || "Pas d'adresse"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={loc.is_active ? "default" : "destructive"}>{loc.is_active ? "Actif" : "Inactif"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => { setEditId(loc.id); setForm({ name: loc.name, address: loc.address }); setOpen(true) }} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
