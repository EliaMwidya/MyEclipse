"use client"

import React from "react"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const roles = [
  { value: "super_admin", label: "Super Admin" },
  { value: "manager", label: "Gerant" },
  { value: "cashier", label: "Caissier" },
  { value: "waiter", label: "Serveur/Serveuse" },
  { value: "warehouse", label: "Entrepot" },
]

const roleBadgeColor: Record<string, string> = {
  super_admin: "bg-primary/20 text-primary",
  manager: "bg-emerald-500/20 text-emerald-400",
  cashier: "bg-blue-500/20 text-blue-400",
  waiter: "bg-amber-500/20 text-amber-400",
  warehouse: "bg-cyan-500/20 text-cyan-400",
}

interface UserForm {
  email: string
  password: string
  fullName: string
  role: string
  pointOfSaleId: string
  isActive: boolean
}

const emptyForm: UserForm = { email: "", password: "", fullName: "", role: "waiter", pointOfSaleId: "", isActive: true }

export default function UsersPage() {
  const { data: users, mutate } = useSWR("/api/users", fetcher)
  const { data: posLocations } = useSWR("/api/pos-locations", fetcher)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/users/${editId}` : "/api/users"
    const method = editId ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editId ? "Utilisateur modifie" : "Utilisateur cree")
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
    if (!confirm("Desactiver cet utilisateur ?")) return
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Utilisateur desactive")
      mutate()
    }
  }

  function openEdit(user: { id: string; email: string; full_name: string; role: string; point_of_sale_id: string; is_active: boolean }) {
    setEditId(user.id)
    setForm({
      email: user.email,
      password: "",
      fullName: user.full_name,
      role: user.role,
      pointOfSaleId: user.point_of_sale_id || "",
      isActive: user.is_active,
    })
    setOpen(true)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Utilisateurs</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm) } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">{editId ? "Modifier" : "Nouvel"} utilisateur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Nom complet</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Mot de passe {editId && "(laisser vide pour garder)"}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Point de vente</Label>
                <Select value={form.pointOfSaleId} onValueChange={(v) => setForm({ ...form, pointOfSaleId: v })}>
                  <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="none">Aucun</SelectItem>
                    {(posLocations || []).map((p: { id: string; name: string }) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                {editId ? "Modifier" : "Creer"}
              </Button>
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Point de vente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((user: { id: string; email: string; full_name: string; role: string; pos_name: string; is_active: boolean; point_of_sale_id: string }) => (
                  <tr key={user.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-card-foreground">{user.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeColor[user.role] || "bg-secondary text-muted-foreground"}`}>
                        {roles.find((r) => r.value === user.role)?.label || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.pos_name || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="text-muted-foreground hover:text-destructive">
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
