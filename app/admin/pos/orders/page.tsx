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
import { Plus, Minus, CreditCard, Edit2, Check, Lock, X, Clock, ChefHat, CheckCircle2, UtensilsCrossed, Ban, Printer } from "lucide-react"
import { generateThermalReceipt, openPrintWindow } from "@/lib/pdf-generator"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  received: { label: "Recue", color: "text-blue-400", bgColor: "bg-blue-500/20 border-blue-500/40", icon: <Clock className="h-5 w-5" /> },
  preparing: { label: "En preparation", color: "text-amber-400", bgColor: "bg-amber-500/20 border-amber-500/40", icon: <ChefHat className="h-5 w-5" /> },
  ready: { label: "Prete", color: "text-emerald-400", bgColor: "bg-emerald-500/20 border-emerald-500/40", icon: <CheckCircle2 className="h-5 w-5" /> },
  delivered: { label: "Livree", color: "text-slate-400", bgColor: "bg-slate-500/20 border-slate-500/40", icon: <UtensilsCrossed className="h-5 w-5" /> },
  cancelled: { label: "Annulee", color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/40", icon: <Ban className="h-5 w-5" /> },
  closed: { label: "Cloturee", color: "text-violet-400", bgColor: "bg-violet-500/20 border-violet-500/40", icon: <Lock className="h-5 w-5" /> },
}

const statusTabs = ["all", "received", "preparing", "ready", "delivered", "closed"]
const statusTabLabels: Record<string, string> = {
  all: "Toutes", received: "Recues", preparing: "En cours", ready: "Pretes", delivered: "Livrees", closed: "Cloturees"
}

interface CartItem { menuItemId: string; itemName: string; unitPrice: number; quantity: number; optionsTotal: number }
interface OrderType { id: string; order_number: string; status: string; total: number; table_number: string; order_type: string; client_name: string; created_at: string; items: { id: string; menu_item_id: string; item_name: string; quantity: number; unit_price: number; total: number; options_total: number }[] }

export default function OrdersPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")
  const { data: orders, mutate } = useSWR(selectedPos ? `/api/pos/orders?posId=${selectedPos}` : null, fetcher, { refreshInterval: 5000 })
  const { data: menuItems } = useSWR(selectedPos ? `/api/pos/menu?posId=${selectedPos}` : null, fetcher)
  const { data: tables } = useSWR(selectedPos ? `/api/pos/tables?posId=${selectedPos}` : null, fetcher)
  const { data: waiters } = useSWR("/api/users?role=waiter,cashier", fetcher)
  const { data: settings } = useSWR("/api/settings", fetcher)

  const [activeTab, setActiveTab] = useState("all")
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableId, setTableId] = useState("")
  const [orderType, setOrderType] = useState("dine_in")
  const [clientName, setClientName] = useState("")
  const [notes, setNotes] = useState("")

  // Selected order for detail view
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null)

  // Edit order modal
  const [editingOrder, setEditingOrder] = useState<{ id: string; items: CartItem[] } | null>(null)
  const [editCart, setEditCart] = useState<CartItem[]>([])

  // Payment modal
  const [payingOrder, setPayingOrder] = useState<{ id: string; total: number; order_number: string } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountCash, setAmountCash] = useState("")
  const [amountMobile, setAmountMobile] = useState("")
  const [amountCard, setAmountCard] = useState("")
  const [selectedWaiter, setSelectedWaiter] = useState("")

  const company = {
    name: settings?.restaurant_name || "Eclipse Lunc Bar",
    address: settings?.restaurant_address || "",
    phone: settings?.restaurant_phone || "",
    currency: settings?.currency || "CDF",
    tvaRate: settings?.tva_rate || "18",
  }

  // Filter orders by status tab
  const ordersList = Array.isArray(orders) ? orders : []
  const filteredOrders = ordersList.filter((order: OrderType) => 
    activeTab === "all" ? order.status !== "cancelled" : order.status === activeTab
  )

  // Count by status
  const countByStatus = (status: string) => ordersList.filter((o: OrderType) => o.status === status).length

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, itemName: item.name, unitPrice: Number(item.price), quantity: 1, optionsTotal: 0 }]
    })
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0)

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { toast.error("Panier vide"); return }
    const res = await fetch("/api/pos/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointOfSaleId: selectedPos, tableId: tableId || null, orderType, items: cart, notes, clientName }),
    })
    if (res.ok) {
      toast.success("Commande creee")
      mutate(); setOpen(false); setCart([]); setTableId(""); setNotes(""); setClientName("")
    } else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const res = await fetch(`/api/pos/orders/${orderId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success("Statut mis a jour"); mutate(); setSelectedOrder(null) }
    else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  // Edit order functions
  function startEditingOrder(order: OrderType) {
    const items: CartItem[] = (order.items || []).map(item => ({
      menuItemId: item.menu_item_id,
      itemName: item.item_name,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      optionsTotal: item.options_total || 0,
    }))
    setEditingOrder({ id: order.id, items })
    setEditCart(items)
  }

  function addToEditCart(item: { id: string; name: string; price: number }) {
    setEditCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, itemName: item.name, unitPrice: Number(item.price), quantity: 1, optionsTotal: 0 }]
    })
  }

  function updateEditQty(menuItemId: string, delta: number) {
    setEditCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0))
  }

  const editCartTotal = editCart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0)

  async function handleSaveOrderItems() {
    if (!editingOrder) return
    const res = await fetch(`/api/pos/orders/${editingOrder.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: editCart }),
    })
    if (res.ok) {
      toast.success("Commande mise a jour")
      mutate()
      setEditingOrder(null)
      setEditCart([])
    } else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  // Payment functions
  function startPayment(order: { id: string; total: number; order_number: string }) {
    setPayingOrder(order)
    setAmountCash(String(order.total))
    setPaymentMethod("cash")
    setSelectedWaiter("")
  }

  async function handlePayment() {
    if (!payingOrder) return
    const res = await fetch("/api/pos/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: payingOrder.id,
        paymentMethod,
        amountCash: Number(amountCash) || 0,
        amountMobile: Number(amountMobile) || 0,
        amountCard: Number(amountCard) || 0,
        waiterId: selectedWaiter || null,
      }),
    })
    if (res.ok) {
      const payment = await res.json()
      toast.success(`Paiement ${payment.invoice_number} enregistre`)
      handlePrintReceipt(payment.id)
      setPayingOrder(null)
      setAmountCash(""); setAmountMobile(""); setAmountCard("")
      setSelectedOrder(null)
      mutate()
    } else { const d = await res.json(); toast.error(d.error || "Erreur") }
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

  async function checkAndCloseOrder(orderId: string) {
    const res = await fetch(`/api/pos/orders/${orderId}`)
    const order = await res.json()
    if (!order.is_paid) {
      toast.error("Impossible de cloturer: le paiement n'a pas encore ete effectue")
      return
    }
    updateOrderStatus(orderId, "closed")
  }

  // Get next status action
  function getNextStatusAction(status: string): { label: string; nextStatus: string; color: string } | null {
    switch (status) {
      case "received": return { label: "Preparer", nextStatus: "preparing", color: "bg-amber-500 hover:bg-amber-600" }
      case "preparing": return { label: "Prete", nextStatus: "ready", color: "bg-emerald-500 hover:bg-emerald-600" }
      case "ready": return { label: "Livree", nextStatus: "delivered", color: "bg-blue-500 hover:bg-blue-600" }
      default: return null
    }
  }

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Commandes POS</h1>
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
          {selectedPos && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-12 bg-primary px-6 text-primary-foreground">
                  <Plus className="mr-2 h-5 w-5" /> Nouvelle commande
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card text-card-foreground">
                <DialogHeader>
                  <DialogTitle className="text-xl text-card-foreground">Nouvelle commande</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOrder} className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-card-foreground">Type</Label>
                      <Select value={orderType} onValueChange={setOrderType}>
                        <SelectTrigger className="h-12 border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-border bg-card text-card-foreground">
                          <SelectItem value="dine_in">Sur place</SelectItem>
                          <SelectItem value="takeaway">A emporter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-card-foreground">Table</Label>
                      <Select value={tableId} onValueChange={setTableId}>
                        <SelectTrigger className="h-12 border-border bg-secondary text-foreground"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                        <SelectContent className="border-border bg-card text-card-foreground">
                          {(tables || []).filter((t: { status: string }) => t.status === "available").map((t: { id: string; table_number: string }) => (
                            <SelectItem key={t.id} value={t.id}>Table {t.table_number}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-card-foreground">Client</Label>
                      <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom" className="h-12 border-border bg-secondary text-foreground" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-card-foreground">Articles du menu</Label>
                    <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
                      {(menuItems || []).filter((m: { is_available: boolean }) => m.is_available).map((m: { id: string; name: string; price: number }) => (
                        <Button key={m.id} type="button" variant="outline" onClick={() => addToCart(m)} className="h-16 flex-col justify-center border-border text-foreground hover:bg-primary/10">
                          <span className="truncate text-sm font-medium">{m.name}</span>
                          <span className="text-xs text-primary">{Number(m.price).toLocaleString()} CDF</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <Card className="border-border bg-secondary">
                      <CardContent className="p-3">
                        {cart.map((c) => (
                          <div key={c.menuItemId} className="flex items-center justify-between py-2">
                            <span className="font-medium text-foreground">{c.itemName}</span>
                            <div className="flex items-center gap-3">
                              <Button type="button" variant="outline" size="icon" onClick={() => updateQty(c.menuItemId, -1)} className="h-8 w-8 border-border"><Minus className="h-4 w-4" /></Button>
                              <span className="w-8 text-center text-lg font-bold text-foreground">{c.quantity}</span>
                              <Button type="button" variant="outline" size="icon" onClick={() => updateQty(c.menuItemId, 1)} className="h-8 w-8 border-border"><Plus className="h-4 w-4" /></Button>
                              <span className="w-24 text-right font-medium text-primary">{(c.quantity * c.unitPrice).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                        <div className="mt-3 border-t border-border pt-3 text-right text-xl font-bold text-primary">
                          Total: {cartTotal.toLocaleString()} CDF
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="h-12 border-border bg-secondary text-foreground" />
                  <Button type="submit" size="lg" className="h-14 bg-primary text-lg text-primary-foreground" disabled={cart.length === 0}>
                    Creer la commande
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedPos ? (
        <Card className="flex-1 border-border bg-card">
          <CardContent className="flex h-full items-center justify-center text-muted-foreground">
            Selectionnez un point de vente pour voir les commandes
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Status Tabs - Left Side */}
          <div className="flex w-48 flex-col gap-2">
            {statusTabs.map((tab) => {
              const count = tab === "all" ? ordersList.filter((o: OrderType) => o.status !== "cancelled").length : countByStatus(tab)
              const config = tab !== "all" ? statusConfig[tab] : null
              return (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab)}
                  className={`h-14 justify-start gap-3 ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
                >
                  {config && <span className={config.color}>{config.icon}</span>}
                  <span className="flex-1 text-left">{statusTabLabels[tab]}</span>
                  <Badge variant="secondary" className="ml-auto">{count}</Badge>
                </Button>
              )
            })}
          </div>

          {/* Orders Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredOrders.map((order: OrderType) => {
                const config = statusConfig[order.status] || statusConfig.received
                const nextAction = getNextStatusAction(order.status)
                return (
                  <Card
                    key={order.id}
                    className={`cursor-pointer border-2 transition-all hover:shadow-lg ${config.bgColor} ${selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-lg font-bold text-foreground">{order.order_number}</span>
                        <Badge className={`${config.bgColor} ${config.color} border`}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </div>
                      
                      <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {order.table_number && (
                          <Badge variant="outline" className="border-border">Table {order.table_number}</Badge>
                        )}
                        <Badge variant="outline" className="border-border">
                          {order.order_type === "dine_in" ? "Sur place" : "A emporter"}
                        </Badge>
                      </div>

                      {order.client_name && (
                        <p className="mb-2 text-sm text-muted-foreground">{order.client_name}</p>
                      )}

                      <div className="mb-3 space-y-1">
                        {(order.items || []).slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.quantity}x {item.item_name}</span>
                          </div>
                        ))}
                        {(order.items || []).length > 3 && (
                          <p className="text-xs text-muted-foreground">+{(order.items || []).length - 3} autres articles</p>
                        )}
                      </div>

                      <div className="mb-3 border-t border-border/50 pt-2">
                        <p className="text-right text-xl font-bold text-primary">
                          {Number(order.total).toLocaleString()} CDF
                        </p>
                      </div>

                      {/* Quick action button */}
                      {nextAction && (
                        <Button
                          size="lg"
                          className={`h-12 w-full text-white ${nextAction.color}`}
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, nextAction.nextStatus) }}
                        >
                          {nextAction.label}
                        </Button>
                      )}

                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredOrders.length === 0 && (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Aucune commande dans cette categorie
              </div>
            )}
          </div>

          {/* Order Detail Panel */}
          {selectedOrder && (
            <Card className="w-80 flex-shrink-0 border-border bg-card">
              <CardContent className="flex h-full flex-col p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{selectedOrder.order_number}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {(() => {
                  const sc = statusConfig[selectedOrder.status] || statusConfig.received
                  return (
                    <Badge className={`mb-4 w-fit ${sc.bgColor} ${sc.color} border`}>
                      {sc.icon}
                      <span className="ml-1">{sc.label}</span>
                    </Badge>
                  )
                })()}

                <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                  {selectedOrder.table_number && <p>Table {selectedOrder.table_number}</p>}
                  <p>{selectedOrder.order_type === "dine_in" ? "Sur place" : "A emporter"}</p>
                  {selectedOrder.client_name && <p>Client: {selectedOrder.client_name}</p>}
                  <p>{new Date(selectedOrder.created_at).toLocaleString("fr-FR")}</p>
                </div>

                <div className="mb-4 flex-1 overflow-y-auto">
                  <h4 className="mb-2 font-semibold text-foreground">Articles</h4>
                  {(selectedOrder.items || []).map((item) => (
                    <div key={item.id} className="flex justify-between border-b border-border/50 py-2 text-sm">
                      <span className="text-foreground">{item.quantity}x {item.item_name}</span>
                      <span className="text-primary">{Number(item.total).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4 border-t border-border pt-3">
                  <p className="text-right text-2xl font-bold text-primary">
                    {Number(selectedOrder.total).toLocaleString()} CDF
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Status progression */}
                  {getNextStatusAction(selectedOrder.status) && (
                    <Button
                      size="lg"
                      className={`h-14 w-full text-lg text-white ${getNextStatusAction(selectedOrder.status)!.color}`}
                      onClick={() => updateOrderStatus(selectedOrder.id, getNextStatusAction(selectedOrder.status)!.nextStatus)}
                    >
                      {getNextStatusAction(selectedOrder.status)!.label}
                    </Button>
                  )}

                  {/* Edit button */}
                  {!["delivered", "cancelled", "closed"].includes(selectedOrder.status) && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-full border-border text-foreground"
                      onClick={() => startEditingOrder(selectedOrder)}
                    >
                      <Edit2 className="mr-2 h-5 w-5" /> Modifier articles
                    </Button>
                  )}

                  {/* Payment button */}
                  {!["cancelled", "closed"].includes(selectedOrder.status) && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-full border-primary text-primary hover:bg-primary/10"
                      onClick={() => startPayment({ id: selectedOrder.id, total: Number(selectedOrder.total), order_number: selectedOrder.order_number })}
                    >
                      <CreditCard className="mr-2 h-5 w-5" /> Payer
                    </Button>
                  )}

                  {/* Close button */}
                  {selectedOrder.status === "delivered" && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-full border-violet-500 text-violet-400 hover:bg-violet-500/10"
                      onClick={() => checkAndCloseOrder(selectedOrder.id)}
                    >
                      <Lock className="mr-2 h-5 w-5" /> Cloturer
                    </Button>
                  )}

                  {/* Cancel button */}
                  {!["delivered", "cancelled", "closed"].includes(selectedOrder.status) && (
                    <Button
                      size="lg"
                      variant="ghost"
                      className="h-12 w-full text-destructive hover:bg-destructive/10"
                      onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}
                    >
                      <X className="mr-2 h-5 w-5" /> Annuler
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => { if (!open) { setEditingOrder(null); setEditCart([]) } }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-xl text-card-foreground">Modifier la commande</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-2 block text-card-foreground">Ajouter des articles</Label>
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
                {(menuItems || []).filter((m: { is_available: boolean }) => m.is_available).map((m: { id: string; name: string; price: number }) => (
                  <Button key={m.id} type="button" variant="outline" onClick={() => addToEditCart(m)} className="h-14 flex-col justify-center border-border text-foreground hover:bg-primary/10">
                    <span className="truncate text-sm">{m.name}</span>
                    <span className="text-xs text-primary">{Number(m.price).toLocaleString()}</span>
                  </Button>
                ))}
              </div>
            </div>

            {editCart.length > 0 && (
              <Card className="border-border bg-secondary">
                <CardContent className="p-3">
                  <Label className="mb-2 block text-card-foreground">Articles de la commande</Label>
                  {editCart.map((c) => (
                    <div key={c.menuItemId} className="flex items-center justify-between py-2">
                      <span className="font-medium text-foreground">{c.itemName}</span>
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" size="icon" onClick={() => updateEditQty(c.menuItemId, -1)} className="h-8 w-8 border-border"><Minus className="h-4 w-4" /></Button>
                        <span className="w-8 text-center text-lg font-bold text-foreground">{c.quantity}</span>
                        <Button type="button" variant="outline" size="icon" onClick={() => updateEditQty(c.menuItemId, 1)} className="h-8 w-8 border-border"><Plus className="h-4 w-4" /></Button>
                        <span className="w-24 text-right font-medium text-primary">{(c.quantity * c.unitPrice).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 border-t border-border pt-3 text-right text-xl font-bold text-primary">
                    Total: {editCartTotal.toLocaleString()} CDF
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setEditingOrder(null); setEditCart([]) }} className="h-12 flex-1 border-border text-foreground">Annuler</Button>
              <Button onClick={handleSaveOrderItems} className="h-12 flex-1 bg-primary text-primary-foreground" disabled={editCart.length === 0}>
                <Check className="mr-2 h-5 w-5" /> Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={!!payingOrder} onOpenChange={(open) => { if (!open) { setPayingOrder(null); setAmountCash(""); setAmountMobile(""); setAmountCard("") } }}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-xl text-card-foreground">Paiement - {payingOrder?.order_number}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Total a payer</p>
              <p className="text-3xl font-bold text-primary">{payingOrder?.total.toLocaleString()} CDF</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Serveur(se)</Label>
              <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger className="h-12 border-border bg-secondary text-foreground"><SelectValue placeholder="Assigner un serveur" /></SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  {(waiters || []).map((w: { id: string; full_name: string }) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Mode de paiement</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "cash", label: "Especes" },
                  { value: "mobile_money", label: "Mobile" },
                  { value: "card", label: "Carte" },
                  { value: "mixed", label: "Mixte" },
                ].map((method) => (
                  <Button
                    key={method.value}
                    type="button"
                    variant={paymentMethod === method.value ? "default" : "outline"}
                    className={`h-12 ${paymentMethod === method.value ? "bg-primary text-primary-foreground" : "border-border text-foreground"}`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {(paymentMethod === "cash" || paymentMethod === "mixed") && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Montant Especes (CDF)</Label>
                <Input type="number" value={amountCash} onChange={(e) => setAmountCash(e.target.value)} className="h-12 border-border bg-secondary text-lg text-foreground" />
              </div>
            )}
            {(paymentMethod === "mobile_money" || paymentMethod === "mixed") && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Montant Mobile Money (CDF)</Label>
                <Input type="number" value={amountMobile} onChange={(e) => setAmountMobile(e.target.value)} className="h-12 border-border bg-secondary text-lg text-foreground" />
              </div>
            )}
            {(paymentMethod === "card" || paymentMethod === "mixed") && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Montant Carte (CDF)</Label>
                <Input type="number" value={amountCard} onChange={(e) => setAmountCard(e.target.value)} className="h-12 border-border bg-secondary text-lg text-foreground" />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPayingOrder(null)} className="h-14 flex-1 border-border text-foreground">Annuler</Button>
              <Button onClick={handlePayment} className="h-14 flex-1 bg-primary text-lg text-primary-foreground">
                <Printer className="mr-2 h-5 w-5" /> Payer + Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
