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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { CreditCard, DollarSign, User, Phone, Calendar, History, Loader2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CreditsPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  
  const { data: credits, mutate: mutateCredits } = useSWR(
    selectedPos ? `/api/pos/credits?posId=${selectedPos}&status=${statusFilter}` : null,
    fetcher
  )

  // Payment dialog
  const [selectedCredit, setSelectedCredit] = useState<{
    id: string
    credit_reference: string
    client_name: string
    total_amount: number
    remaining_amount: number
    order_number: string
  } | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // History dialog
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [creditHistory, setCreditHistory] = useState<{
    id: string
    payment_reference: string
    amount: number
    payment_method: string
    created_at: string
    received_by_name: string
    notes: string
  }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  function openPayment(credit: typeof selectedCredit) {
    setSelectedCredit(credit)
    setPaymentAmount(String(credit?.remaining_amount || 0))
    setPaymentMethod("cash")
    setPaymentNotes("")
    setShowPaymentDialog(true)
  }

  async function handlePayment() {
    if (!selectedCredit || !paymentAmount) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/pos/credits/${selectedCredit.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
          notes: paymentNotes,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Paiement ${data.payment_reference} enregistre`)
        setShowPaymentDialog(false)
        mutateCredits()
      } else {
        const err = await res.json()
        toast.error(err.error || "Erreur")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function openHistory(credit: typeof selectedCredit) {
    if (!credit) return
    setSelectedCredit(credit)
    setLoadingHistory(true)
    setShowHistoryDialog(true)
    try {
      const res = await fetch(`/api/pos/credits/${credit.id}/payments`)
      const data = await res.json()
      setCreditHistory(data)
    } catch {
      toast.error("Erreur chargement historique")
    } finally {
      setLoadingHistory(false)
    }
  }

  const totalCredits = (credits || []).reduce((sum: number, c: { remaining_amount: number }) => sum + Number(c.remaining_amount), 0)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Gestion des credits</h1>
          <p className="text-sm text-muted-foreground">Suivi des ventes a credit et paiements</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] border-border bg-secondary text-foreground">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-card-foreground">
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
              <SelectItem value="paid">Solde</SelectItem>
            </SelectContent>
          </Select>
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
        </div>
      </div>

      {selectedPos && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credits en cours</p>
                  <p className="text-xl font-bold text-foreground">{(credits || []).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total restant</p>
                  <p className="text-xl font-bold text-foreground">{totalCredits.toLocaleString()} CDF</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedPos ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Selectionnez un point de vente
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Liste des credits</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Commande</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Restant</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(credits || []).map((credit: {
                    id: string
                    credit_reference: string
                    client_name: string
                    client_phone: string
                    order_number: string
                    total_amount: number
                    remaining_amount: number
                    status: string
                    due_date: string
                  }) => (
                    <tr key={credit.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {credit.credit_reference}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-card-foreground">{credit.client_name}</p>
                            {credit.client_phone && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" /> {credit.client_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{credit.order_number}</td>
                      <td className="px-4 py-3 text-right font-medium text-card-foreground">
                        {Number(credit.total_amount).toLocaleString()} CDF
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-destructive">
                        {Number(credit.remaining_amount).toLocaleString()} CDF
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={credit.status === 'paid' ? 'default' : credit.status === 'partial' ? 'secondary' : 'destructive'}
                          className={
                            credit.status === 'paid'
                              ? 'bg-green-500/20 text-green-500'
                              : credit.status === 'partial'
                              ? 'bg-yellow-500/20 text-yellow-500'
                              : 'bg-destructive/20 text-destructive'
                          }
                        >
                          {credit.status === 'paid' ? 'Solde' : credit.status === 'partial' ? 'Partiel' : 'En attente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {credit.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => openPayment(credit)}
                              className="bg-primary text-primary-foreground"
                            >
                              <DollarSign className="mr-1 h-4 w-4" /> Payer
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openHistory(credit)}
                            className="border-border text-foreground"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(credits || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Aucun credit trouve
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Paiement credit - {selectedCredit?.credit_reference}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground">Client: {selectedCredit?.client_name}</p>
              <p className="text-sm text-muted-foreground">Commande: {selectedCredit?.order_number}</p>
              <p className="mt-2 text-lg font-bold text-foreground">
                Restant: {Number(selectedCredit?.remaining_amount || 0).toLocaleString()} CDF
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Montant du paiement</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={selectedCredit?.remaining_amount}
                className="border-border bg-secondary text-foreground"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="cash">Especes</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Carte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Notes (optionnel)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="border-border bg-secondary text-foreground"
                placeholder="Notes sur le paiement..."
              />
            </div>
            <Button onClick={handlePayment} disabled={isSubmitting} className="bg-primary text-primary-foreground">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" /> Confirmer le paiement
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Historique - {selectedCredit?.credit_reference}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground">Client: {selectedCredit?.client_name}</p>
              <p className="text-sm">Total: {Number(selectedCredit?.total_amount || 0).toLocaleString()} CDF</p>
              <p className="text-sm font-bold text-destructive">
                Restant: {Number(selectedCredit?.remaining_amount || 0).toLocaleString()} CDF
              </p>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : creditHistory.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-2 text-left text-muted-foreground">Date</th>
                      <th className="px-2 py-2 text-left text-muted-foreground">Reference</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHistory.map((p) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="px-2 py-2 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className="text-xs">{p.payment_reference}</Badge>
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-green-500">
                          +{Number(p.amount).toLocaleString()} CDF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">Aucun paiement enregistre</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
