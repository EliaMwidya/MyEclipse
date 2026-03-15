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
import { Plus, Pencil, Truck } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SuppliersPage() {
  const { data: suppliers, mutate } = useSWR("/api/warehouse/suppliers", fetcher)
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "", address: "" })
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/warehouse/suppliers/${editId}` : "/api/warehouse/suppliers"
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editId ? "Fournisseur modifie" : "Fournisseur cree")
      mutate(); setOpen(false); setForm({ name: "", contact: "", phone: "", email: "", address: "" }); setEditId(null)
    } else toast.error("Erreur")
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Fournisseurs</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm({ name: "", contact: "", phone: "", email: "", address: "" }) } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader><DialogTitle className="text-card-foreground">{editId ? "Modifier" : "Nouveau"} fournisseur</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Contact</Label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Telephone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(suppliers || []).map((s: { id: string; name: string; contact: string; phone: string; email: string; address: string }) => (
          <Card key={s.id} className="border-border bg-card">
            <CardContent className="flex items-start justify-between p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.contact} {s.phone && `- ${s.phone}`}</p>
                  {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                setEditId(s.id); setForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, address: s.address }); setOpen(true)
              }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
