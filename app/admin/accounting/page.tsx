"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  BookOpen,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ArrowDownCircle,
  DollarSign,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const typeLabels: Record<string, string> = {
  revenue: "Revenus",
  expense: "Depenses",
  supply: "Approvisionnements",
  withdrawal: "Retraits caisse",
  adjustment: "Ajustements",
}
const typeColors: Record<string, string> = {
  revenue: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expense: "bg-red-500/20 text-red-400 border-red-500/30",
  supply: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  withdrawal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  adjustment: "bg-muted text-muted-foreground border-border",
}
const typeIcons: Record<string, typeof TrendingUp> = {
  revenue: TrendingUp,
  expense: TrendingDown,
  supply: ArrowRightLeft,
  withdrawal: ArrowDownCircle,
  adjustment: DollarSign,
}

export default function AccountingPage() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
  const lastDay = today.toISOString().split("T")[0]

  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(lastDay)
  const [filterType, setFilterType] = useState("all")
  const [posId, setPosId] = useState("all")

  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const posParam = posId && posId !== "all" ? `&posId=${posId}` : ""
  const typeParam = filterType && filterType !== "all" ? `&type=${filterType}` : ""

  const { data: summary } = useSWR(
    `/api/accounting?type=summary&from=${from}&to=${to}${posParam}`,
    fetcher
  )
  const { data: entries, mutate } = useSWR(
    `/api/accounting?from=${from}&to=${to}${posParam}${typeParam}`,
    fetcher
  )

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    entryDate: lastDay,
    description: "",
    entryType: "expense",
    debit: "",
    credit: "",
    pointOfSaleId: "",
    reference: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryDate: form.entryDate,
        description: form.description,
        entryType: form.entryType,
        debit: Number(form.debit) || 0,
        credit: Number(form.credit) || 0,
        pointOfSaleId: form.pointOfSaleId || null,
        reference: form.reference || null,
      }),
    })
    if (res.ok) {
      toast.success("Ecriture comptable enregistree")
      mutate()
      setOpen(false)
      setForm({ entryDate: lastDay, description: "", entryType: "expense", debit: "", credit: "", pointOfSaleId: "", reference: "" })
    } else {
      const d = await res.json()
      toast.error(d.error || "Erreur")
    }
  }

  const totalRevenue = (summary?.byType || [])
    .filter((t: { entry_type: string }) => t.entry_type === "revenue")
    .reduce((s: number, t: { total_credit: number }) => s + Number(t.total_credit), 0)
  const totalExpenses = (summary?.byType || [])
    .filter((t: { entry_type: string }) => t.entry_type === "expense" || t.entry_type === "supply")
    .reduce((s: number, t: { total_debit: number }) => s + Number(t.total_debit), 0)
  const totalWithdrawals = (summary?.byType || [])
    .filter((t: { entry_type: string }) => t.entry_type === "withdrawal")
    .reduce((s: number, t: { total_debit: number }) => s + Number(t.total_debit), 0)
  const netProfit = totalRevenue - totalExpenses - totalWithdrawals

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold text-foreground">Comptabilite</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle ecriture
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Nouvelle ecriture comptable</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Date</Label>
                  <Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Type</Label>
                  <Select value={form.entryType} onValueChange={(v) => setForm({ ...form, entryType: v })}>
                    <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-border bg-card text-card-foreground">
                      <SelectItem value="revenue">Revenu</SelectItem>
                      <SelectItem value="expense">Depense</SelectItem>
                      <SelectItem value="supply">Approvisionnement</SelectItem>
                      <SelectItem value="withdrawal">Retrait caisse</SelectItem>
                      <SelectItem value="adjustment">Ajustement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="border-border bg-secondary text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Debit (CDF)</Label>
                  <Input type="number" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Credit (CDF)</Label>
                  <Input type="number" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} className="border-border bg-secondary text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Reference</Label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optionnel" className="border-border bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-foreground">Point de vente</Label>
                  <Select value={form.pointOfSaleId} onValueChange={(v) => setForm({ ...form, pointOfSaleId: v })}>
                    <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent className="border-border bg-card text-card-foreground">
                      {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenus</p>
                <p className="text-xl font-bold text-emerald-400">{totalRevenue.toLocaleString()} CDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depenses + Appro</p>
                <p className="text-xl font-bold text-red-400">{totalExpenses.toLocaleString()} CDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ArrowDownCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retraits caisse</p>
                <p className="text-xl font-bold text-amber-400">{totalWithdrawals.toLocaleString()} CDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border bg-card ${netProfit >= 0 ? "" : "border-red-500/30"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${netProfit >= 0 ? "bg-primary/10" : "bg-red-500/10"}`}>
                <DollarSign className={`h-5 w-5 ${netProfit >= 0 ? "text-primary" : "text-red-400"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultat net</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? "text-primary" : "text-red-400"}`}>{netProfit.toLocaleString()} CDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px] border-border bg-secondary text-foreground" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px] border-border bg-secondary text-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] border-border bg-secondary text-foreground"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className="border-border bg-card text-card-foreground">
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="revenue">Revenus</SelectItem>
            <SelectItem value="expense">Depenses</SelectItem>
            <SelectItem value="supply">Approvisionnements</SelectItem>
            <SelectItem value="withdrawal">Retraits</SelectItem>
            <SelectItem value="adjustment">Ajustements</SelectItem>
          </SelectContent>
        </Select>
        <Select value={posId} onValueChange={setPosId}>
          <SelectTrigger className="w-[160px] border-border bg-secondary text-foreground"><SelectValue placeholder="POS" /></SelectTrigger>
          <SelectContent className="border-border bg-card text-card-foreground">
            <SelectItem value="all">Tous les POS</SelectItem>
            {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Journal entries table */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base text-card-foreground">Journal comptable ({(entries || []).length} ecritures)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">POS</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Par</th>
                </tr>
              </thead>
              <tbody>
                {(entries || []).map((e: {
                  id: string; entry_date: string; reference: string; entry_type: string;
                  description: string; pos_name: string; debit: number; credit: number;
                  created_by_name: string
                }) => {
                  const Icon = typeIcons[e.entry_type] || DollarSign
                  return (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(e.entry_date).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">
                        {e.reference ? <Badge variant="outline" className="border-primary/30 text-primary">{e.reference}</Badge> : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={typeColors[e.entry_type]}>
                          <Icon className="mr-1 h-3 w-3" />
                          {typeLabels[e.entry_type]}
                        </Badge>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-card-foreground">{e.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.pos_name || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-400">
                        {Number(e.debit) > 0 ? Number(e.debit).toLocaleString() : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-400">
                        {Number(e.credit) > 0 ? Number(e.credit).toLocaleString() : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.created_by_name || "-"}</td>
                    </tr>
                  )
                })}
                {(!entries || entries.length === 0) && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucune ecriture comptable</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
