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
import { Plus, Trash2, Store, Users } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusMap: Record<string, { label: string; color: string }> = {
  available: { label: "Disponible", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  occupied: { label: "Occupee", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  reserved: { label: "Reservee", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
}

export default function TablesPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const { data: tables, mutate } = useSWR(selectedPos ? `/api/pos/tables?posId=${selectedPos}` : null, fetcher)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ tableNumber: "", capacity: "4" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/pos/tables", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointOfSaleId: selectedPos, tableNumber: form.tableNumber, capacity: Number(form.capacity) }),
    })
    if (res.ok) { toast.success("Table creee"); mutate(); setOpen(false); setForm({ tableNumber: "", capacity: "4" }) }
    else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette table ?")) return
    const res = await fetch(`/api/pos/tables/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Supprimee"); mutate() }
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/pos/tables/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: (tables || []).find((t: { id: string }) => t.id === id)?.table_number, capacity: (tables || []).find((t: { id: string }) => t.id === id)?.capacity, status }),
    })
    mutate()
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Tables</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedPos} onValueChange={setSelectedPos}>
            <SelectTrigger className="w-[200px] border-border bg-secondary text-foreground"><SelectValue placeholder="Point de vente" /></SelectTrigger>
            <SelectContent className="border-border bg-card text-card-foreground">
              {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedPos && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
              <DialogContent className="border-border bg-card text-card-foreground">
                <DialogHeader><DialogTitle className="text-card-foreground">Nouvelle table</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Numero</Label>
                    <Input value={form.tableNumber} onChange={(e) => setForm({ ...form, tableNumber: e.target.value })} required className="border-border bg-secondary text-foreground" placeholder="Ex: T1, A1..." />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Capacite</Label>
                    <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="border-border bg-secondary text-foreground" />
                  </div>
                  <Button type="submit" className="bg-primary text-primary-foreground">Creer</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedPos ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {(tables || []).map((table: { id: string; table_number: string; capacity: number; status: string }) => {
            const st = statusMap[table.status] || statusMap.available
            return (
              <Card key={table.id} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-card-foreground">Table {table.table_number}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {table.capacity} places</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(table.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Badge className={st.color}>{st.label}</Badge>
                  <div className="mt-3 flex gap-1">
                    {table.status !== "available" && <Button size="sm" variant="outline" onClick={() => handleStatusChange(table.id, "available")} className="border-border text-xs text-foreground">Liberer</Button>}
                    {table.status !== "reserved" && <Button size="sm" variant="outline" onClick={() => handleStatusChange(table.id, "reserved")} className="border-border text-xs text-foreground">Reserver</Button>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {tables && tables.length === 0 && (
            <Card className="col-span-full border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Aucune table</CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}
