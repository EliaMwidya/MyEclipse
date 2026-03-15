"use client"

import React from "react"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Layers } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CategoriesPage() {
  const { data: categories, mutate } = useSWR("/api/warehouse/categories", fetcher)
  const [form, setForm] = useState({ name: "", description: "" })
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/warehouse/categories/${editId}` : "/api/warehouse/categories"
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editId ? "Categorie modifiee" : "Categorie creee")
      mutate(); setOpen(false); setForm({ name: "", description: "" }); setEditId(null)
    } else toast.error("Erreur")
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ?")) return
    await fetch(`/api/warehouse/categories/${id}`, { method: "DELETE" })
    toast.success("Supprimee"); mutate()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Categories</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm({ name: "", description: "" }) } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader><DialogTitle className="text-card-foreground">{editId ? "Modifier" : "Nouvelle"} categorie</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{editId ? "Modifier" : "Creer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(categories || []).map((c: { id: string; name: string; description: string }) => (
          <Card key={c.id} className="border-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.description || "Aucune description"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditId(c.id); setForm({ name: c.name, description: c.description }); setOpen(true) }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
