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
import { Receipt, CreditCard, Printer, ArrowDownCircle, Loader2, UserPlus } from "lucide-react"
import { generateThermalReceipt, openPrintWindow } from "@/lib/pdf-generator"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BillingPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const { data: waiters } = useSWR("/api/users?role=waiter,cashier", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const { data: orders, mutate: mutateOrders } = useSWR(selectedPos ? `/api/pos/orders?posId=${selectedPos}` : null, fetcher)
  const { data: payments, mutate: mutatePayments } = useSWR(selectedPos ? `/api/pos/payments?posId=${selectedPos}` : null, fetcher)
  const { data: settings } = useSWR("/api/settings", fetcher)

  // Multi-invoice
  const [payingOrders, setPayingOrders] = useState<Map<string, { id: string; total: number; order_number: string }>>(new Map())
  const [activePayId, setActivePayId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountCash, setAmountCash] = useState("")
  const [amountMobile, setAmountMobile] = useState("")
  const [amountCard, setAmountCard] = useState("")
  const [selectedWaiter, setSelectedWaiter] = useState("")

  // Withdrawal
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [withdrawalReason, setWithdrawalReason] = useState("")

  // Credit sale
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [creditOrderId, setCreditOrderId] = useState("")
  const [creditClientName, setCreditClientName] = useState("")
  const [creditClientPhone, setCreditClientPhone] = useState("")
  const [creditNotes, setCreditNotes] = useState("")

  // Loading states
  const [isPaying, setIsPaying] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isCreatingCredit, setIsCreatingCredit] = useState(false)

  const company = {
    name: settings?.restaurant_name || "Eclipse Lunc Bar",
    address: settings?.restaurant_address || "",
    phone: settings?.restaurant_phone || "",
    currency: settings?.currency || "CDF",
    tvaRate: settings?.tva_rate || "18",
  }

  const unpaidOrders = (orders || []).filter((o: { status: string }) => o.status !== "cancelled" && o.status !== "delivered")

  function startPaying(order: { id: string; total: number; order_number: string }) {
    setPayingOrders((prev) => new Map(prev).set(order.id, order))
    setActivePayId(order.id)
    setAmountCash(String(order.total))
    setPaymentMethod("cash")
    setSelectedWaiter("")
  }

  function removePaying(orderId: string) {
    setPayingOrders((prev) => { const n = new Map(prev); n.delete(orderId); return n })
    if (activePayId === orderId) setActivePayId(null)
  }

  async function handlePay() {
    if (!activePayId) return
    setIsPaying(true)
    try {
      const res = await fetch("/api/pos/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: activePayId, paymentMethod, amountCash: Number(amountCash) || 0, amountMobile: Number(amountMobile) || 0, amountCard: Number(amountCard) || 0, waiterId: selectedWaiter || null }),
      })
      if (res.ok) {
        const payment = await res.json()
        toast.success(`Paiement ${payment.invoice_number} enregistre`)
        removePaying(activePayId)
        mutateOrders(); mutatePayments()
        setAmountCash(""); setAmountMobile(""); setAmountCard("")
        handlePrintReceipt(payment.id)
      } else { const d = await res.json(); toast.error(d.error || "Erreur") }
    } finally {
      setIsPaying(false)
    }
  }

  function openCreditDialog(orderId: string) {
    setCreditOrderId(orderId)
    setCreditClientName("")
    setCreditClientPhone("")
    setCreditNotes("")
    setShowCreditDialog(true)
  }

  async function handleCreateCredit() {
    if (!creditOrderId || !creditClientName) {
      toast.error("Nom du client requis")
      return
    }
    setIsCreatingCredit(true)
    try {
      const res = await fetch("/api/pos/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: creditOrderId,
          clientName: creditClientName,
          clientPhone: creditClientPhone,
          notes: creditNotes,
        }),
      })
      if (res.ok) {
        const credit = await res.json()
        toast.success(`Credit ${credit.credit_reference} cree`)
        setShowCreditDialog(false)
        mutateOrders()
      } else {
        const d = await res.json()
        toast.error(d.error || "Erreur")
      }
    } finally {
      setIsCreatingCredit(false)
    }
  }

  async function handlePrintReceipt(paymentId: string) {
    try {
      const res = await fetch(`/api/pos/payments/${paymentId}`)
      const data = await res.json()
      if (!data.invoice_number) return
      const html = generateThermalReceipt({
        invoiceNumber: data.invoice_number, orderNumber: data.order_number,
        date: new Date(data.created_at).toLocaleString("fr-FR"),
        items: (data.items || []).map((i: { item_name: string; quantity: number; unit_price: number; total: number }) => ({ name: i.item_name, qty: i.quantity, unitPrice: Number(i.unit_price), total: Number(i.total) })),
        subtotal: Number(data.subtotal || data.order_total), taxAmount: Number(data.tax_amount || 0),
        total: Number(data.order_total), totalPaid: Number(data.total_paid), change: Number(data.change_amount || 0),
        paymentMethod: data.payment_method, waiterName: data.waiter_name, cashierName: data.cashier_name,
        tableName: data.table_number ? `Table ${data.table_number}` : undefined, clientName: data.client_name, company,
      })
      openPrintWindow(html)
    } catch { toast.error("Erreur impression") }
  }

  async function handleWithdrawal() {
    if (!selectedPos || !withdrawalAmount || !withdrawalReason) return
    setIsWithdrawing(true)
    try {
      const res = await fetch("/api/pos/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pointOfSaleId: selectedPos, amount: Number(withdrawalAmount), reason: withdrawalReason }) })
      if (res.ok) { toast.success("Retrait enregistre"); setShowWithdrawal(false); setWithdrawalAmount(""); setWithdrawalReason("") }
      else { const d = await res.json(); toast.error(d.error || "Erreur") }
    } finally {
      setIsWithdrawing(false)
    }
  }

  const activeOrder = activePayId ? payingOrders.get(activePayId) : null

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Facturation</h1>
        <div className="flex items-center gap-2">
          {selectedPos && (
            <Button variant="outline" size="sm" onClick={() => setShowWithdrawal(true)} className="border-border text-foreground">
              <ArrowDownCircle className="mr-2 h-4 w-4" /> Retrait caisse
            </Button>
          )}
          <Select value={selectedPos} onValueChange={setSelectedPos}>
            <SelectTrigger className="w-[200px] border-border bg-secondary text-foreground"><SelectValue placeholder="Point de vente" /></SelectTrigger>
            <SelectContent className="border-border bg-card text-card-foreground">
              {(locations || []).map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Multi-invoice tabs */}
      {payingOrders.size > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from(payingOrders.entries()).map(([id, order]) => (
            <Button key={id} variant={activePayId === id ? "default" : "outline"} size="sm"
              onClick={() => { setActivePayId(id); setAmountCash(String(order.total)) }}
              className={activePayId === id ? "bg-primary text-primary-foreground" : "border-border text-foreground"}>
              {order.order_number}
              <button onClick={(e) => { e.stopPropagation(); removePaying(id) }} className="ml-2 text-xs opacity-60 hover:opacity-100">x</button>
            </Button>
          ))}
        </div>
      )}

      {!selectedPos ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">Commandes a payer ({unpaidOrders.length})</h2>
            <div className="flex flex-col gap-3">
              {unpaidOrders.map((order: { id: string; order_number: string; total: number; table_number: string; client_name: string; created_by_name: string }) => (
                <Card key={order.id} className={`border-border bg-card ${payingOrders.has(order.id) ? "ring-1 ring-primary" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-card-foreground">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{order.table_number ? `Table ${order.table_number}` : ""} {order.client_name || ""}</p>
                        {order.created_by_name && <p className="text-xs text-muted-foreground">Serveur(se): {order.created_by_name}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{Number(order.total).toLocaleString()} CDF</span>
                        <Button size="sm" onClick={() => startPaying(order)} disabled={payingOrders.has(order.id)} className="bg-primary text-primary-foreground">
                          <CreditCard className="mr-1 h-4 w-4" /> Payer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openCreditDialog(order.id)} className="border-border text-foreground">
                          <UserPlus className="mr-1 h-4 w-4" /> Credit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {unpaidOrders.length === 0 && <p className="text-sm text-muted-foreground">Aucune commande en attente</p>}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {activeOrder && (
              <Card className="border-primary/30 bg-card">
                <CardHeader className="pb-3"><CardTitle className="text-base text-card-foreground">Paiement - {activeOrder.order_number}</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-lg font-bold text-primary">Total: {activeOrder.total.toLocaleString()} CDF</p>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Serveur(se)</Label>
                    <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                      <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Assigner" /></SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        {(waiters || []).map((w: { id: string; full_name: string }) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Mode</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        <SelectItem value="cash">Especes</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="card">Carte</SelectItem><SelectItem value="mixed">Mixte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(paymentMethod === "cash" || paymentMethod === "mixed") && <div className="flex flex-col gap-2"><Label className="text-card-foreground">Especes</Label><Input type="number" value={amountCash} onChange={(e) => setAmountCash(e.target.value)} className="border-border bg-secondary text-foreground" /></div>}
                  {(paymentMethod === "mobile_money" || paymentMethod === "mixed") && <div className="flex flex-col gap-2"><Label className="text-card-foreground">Mobile Money</Label><Input type="number" value={amountMobile} onChange={(e) => setAmountMobile(e.target.value)} className="border-border bg-secondary text-foreground" /></div>}
                  {(paymentMethod === "card" || paymentMethod === "mixed") && <div className="flex flex-col gap-2"><Label className="text-card-foreground">Carte</Label><Input type="number" value={amountCard} onChange={(e) => setAmountCard(e.target.value)} className="border-border bg-secondary text-foreground" /></div>}
                  <Button onClick={handlePay} disabled={isPaying} className="bg-primary text-primary-foreground">
                    {isPaying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...</> : "Confirmer + Imprimer ticket"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div>
              <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">Paiements recents</h2>
              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Facture</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Serveur</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mode</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Montant</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Ticket</th>
                      </tr></thead>
                      <tbody>
                        {(payments || []).slice(0, 20).map((p: { id: string; invoice_number: string; payment_method: string; total_paid: number; waiter_name: string }) => (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="px-3 py-2"><Badge variant="outline" className="border-primary/30 text-primary">{p.invoice_number}</Badge></td>
                            <td className="px-3 py-2 text-muted-foreground">{p.waiter_name || "-"}</td>
                            <td className="px-3 py-2 capitalize text-muted-foreground">{p.payment_method}</td>
                            <td className="px-3 py-2 text-right font-medium text-card-foreground">{Number(p.total_paid).toLocaleString()} CDF</td>
                            <td className="px-3 py-2 text-center">
                              <Button variant="ghost" size="sm" onClick={() => handlePrintReceipt(p.id)} className="h-7 w-7 p-0 text-primary"><Printer className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-card-foreground">Retrait de caisse</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label className="text-card-foreground">Montant (CDF)</Label><Input type="number" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} className="border-border bg-secondary text-foreground" /></div>
            <div className="flex flex-col gap-2"><Label className="text-card-foreground">Motif</Label><Textarea value={withdrawalReason} onChange={(e) => setWithdrawalReason(e.target.value)} placeholder="Ex: Achat ingredients..." className="border-border bg-secondary text-foreground" /></div>
            <Button onClick={handleWithdrawal} disabled={isWithdrawing} className="bg-primary text-primary-foreground">
              {isWithdrawing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...</> : "Confirmer le retrait"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Sale Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-card-foreground">Vente a credit</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Nom du client *</Label>
              <Input 
                value={creditClientName} 
                onChange={(e) => setCreditClientName(e.target.value)} 
                placeholder="Nom complet du client"
                className="border-border bg-secondary text-foreground" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Telephone</Label>
              <Input 
                value={creditClientPhone} 
                onChange={(e) => setCreditClientPhone(e.target.value)} 
                placeholder="Numero de telephone"
                className="border-border bg-secondary text-foreground" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Notes</Label>
              <Textarea 
                value={creditNotes} 
                onChange={(e) => setCreditNotes(e.target.value)} 
                placeholder="Notes sur le credit..."
                className="border-border bg-secondary text-foreground" 
              />
            </div>
            <Button onClick={handleCreateCredit} disabled={isCreatingCredit || !creditClientName} className="bg-primary text-primary-foreground">
              {isCreatingCredit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creation...</> : "Creer le credit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
