"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { DollarSign, Lock, Unlock } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CashPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const { data: sessions, mutate } = useSWR(selectedPos ? `/api/pos/cash?posId=${selectedPos}` : null, fetcher)
  const [openAmount, setOpenAmount] = useState("")
  const [closeAmount, setCloseAmount] = useState("")
  const [closingSession, setClosingSession] = useState<string | null>(null)

  const openSession = (sessions || []).find((s: { status: string }) => s.status === "open")

  async function handleOpen() {
    const res = await fetch("/api/pos/cash", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointOfSaleId: selectedPos, action: "open", openingAmount: Number(openAmount) || 0 }),
    })
    if (res.ok) { toast.success("Caisse ouverte"); mutate(); setOpenAmount("") }
    else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  async function handleClose() {
    if (!closingSession) return
    const res = await fetch("/api/pos/cash", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", sessionId: closingSession, closingAmount: Number(closeAmount) || 0 }),
    })
    if (res.ok) { toast.success("Caisse fermee"); mutate(); setClosingSession(null); setCloseAmount("") }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Caisse</h1>
        <Select value={selectedPos} onValueChange={setSelectedPos}>
          <SelectTrigger className="w-[200px] border-border bg-secondary text-foreground"><SelectValue placeholder="Point de vente" /></SelectTrigger>
          <SelectContent className="border-border bg-card text-card-foreground">
            {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedPos ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {openSession ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Unlock className="h-5 w-5 text-primary" /> Caisse ouverte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Fond de caisse</p><p className="text-lg font-bold text-card-foreground">{Number(openSession.opening_amount).toLocaleString()} CDF</p></div>
                  <div><p className="text-xs text-muted-foreground">Ventes</p><p className="text-lg font-bold text-primary">{Number(openSession.total_sales).toLocaleString()} CDF</p></div>
                  <div><p className="text-xs text-muted-foreground">Especes</p><p className="text-lg font-bold text-card-foreground">{Number(openSession.total_cash).toLocaleString()} CDF</p></div>
                  <div><p className="text-xs text-muted-foreground">Mobile Money</p><p className="text-lg font-bold text-card-foreground">{Number(openSession.total_mobile).toLocaleString()} CDF</p></div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">Ouverte par: {openSession.opened_by_name} le {new Date(openSession.opened_at).toLocaleString("fr-FR")}</p>
                </div>
                <Button onClick={() => { setClosingSession(openSession.id); setCloseAmount(String(Number(openSession.opening_amount) + Number(openSession.total_cash))) }} className="mt-4 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Lock className="mr-2 h-4 w-4" /> Fermer la caisse
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="mb-3 font-medium text-card-foreground">Ouvrir la caisse</h3>
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Fond de caisse (CDF)</Label>
                    <Input type="number" value={openAmount} onChange={(e) => setOpenAmount(e.target.value)} placeholder="0" className="border-border bg-secondary text-foreground" />
                  </div>
                  <Button onClick={handleOpen} className="bg-primary text-primary-foreground"><Unlock className="mr-2 h-4 w-4" /> Ouvrir</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base text-card-foreground">Historique des sessions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ouvert par</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fond</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ventes</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cloture</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sessions || []).map((s: { id: string; status: string; opened_by_name: string; opening_amount: number; total_sales: number; closing_amount: number; opened_at: string; closed_at: string }) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="px-4 py-3"><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status === "open" ? "Ouverte" : "Fermee"}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{s.opened_by_name || "-"}</td>
                        <td className="px-4 py-3 text-card-foreground">{Number(s.opening_amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-primary font-medium">{Number(s.total_sales).toLocaleString()}</td>
                        <td className="px-4 py-3 text-card-foreground">{s.closing_amount ? Number(s.closing_amount).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(s.opened_at).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!closingSession} onOpenChange={(v) => { if (!v) setClosingSession(null) }}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-card-foreground">Fermer la caisse</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Montant en caisse (comptage physique)</Label>
              <Input type="number" value={closeAmount} onChange={(e) => setCloseAmount(e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <Button onClick={handleClose} className="bg-destructive text-destructive-foreground">Confirmer la fermeture</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
