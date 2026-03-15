"use client"

import React, { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Plus, ShoppingCart, Minus, CreditCard, Edit2, Check, Lock, Clock, ChefHat, CheckCircle, Truck, X, RefreshCw } from "lucide-react"
import { generateThermalReceipt, openPrintWindow } from "@/lib/pdf-generator"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CartItem {
  menuItemId: string
  itemName: string
  unitPrice: number
  quantity: number
  optionsTotal: number
}

interface OrderType {
  id: string
  order_number: string
  status: string
  total: number
  table_number: string
  order_type: string
  client_name: string
  created_at: string
  items: { id: string; menu_item_id: string; item_name: string; quantity: number; unit_price: number; total: number; options_total: number }[]
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  received: { label: "Recue", color: "text-blue-400", bgColor: "bg-blue-500/20 border-blue-500/30", icon: <Clock className="h-4 w-4" /> },
  preparing: { label: "En preparation", color: "text-amber-400", bgColor: "bg-amber-500/20 border-amber-500/30", icon: <ChefHat className="h-4 w-4" /> },
  ready: { label: "Prete", color: "text-emerald-400", bgColor: "bg-emerald-500/20 border-emerald-500/30", icon: <CheckCircle className="h-4 w-4" /> },
  delivered: { label: "Livree", color: "text-slate-400", bgColor: "bg-slate-500/20 border-slate-500/30", icon: <Truck className="h-4 w-4" /> },
  cancelled: { label: "Annulee", color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/30", icon: <X className="h-4 w-4" /> },
  closed: { label: "Cloturee", color: "text-violet-400", bgColor: "bg-violet-500/20 border-violet-500/30", icon: <Lock className="h-4 w-4" /> },
}

const statusTabs = ["all", "received", "preparing", "ready", "delivered", "closed"]

export default function PosOrdersPage() {
  const { data: session } = useSWR("/api/auth/session", fetcher)
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const { data: waiters } = useSWR("/api/users?role=waiter,cashier", fetcher)
  const { data: settings } = useSWR("/api/settings", fetcher)
  const [posId, setPosId] = useState("")

  useEffect(() => {
    if (session?.user?.point_of_sale_id) {
      setPosId(session.user.point_of_sale_id)
    } else if (locations?.length === 1) {
      setPosId(locations[0].id)
    }
  }, [session, locations])

  const { data: orders, mutate } = useSWR(posId ? `/api/pos/orders?posId=${posId}` : null, fetcher, { refreshInterval: 5000 })
  const { data: menuItems } = useSWR(posId ? `/api/pos/menu?posId=${posId}` : null, fetcher)
  const { data: menuCategories } = useSWR(posId ? `/api/pos/menu-categories?posId=${posId}` : null, fetcher)
  const { data: tables } = useSWR(posId ? `/api/pos/tables?posId=${posId}` : null, fetcher)

  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableId, setTableId] = useState("")
  const [orderType, setOrderType] = useState("dine_in")
  const [clientName, setClientName] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeTab, setActiveTab] = useState("all")
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

  const ordersList = Array.isArray(orders) ? orders : []
  const filteredOrders = ordersList.filter((order: OrderType) =>
    activeTab === "all" ? order.status !== "cancelled" : order.status === activeTab
  )
  const countByStatus = (status: string) => ordersList.filter((o: OrderType) => o.status === status).length

  // Cart functions
  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      return [...prev, { menuItemId: item.id, itemName: item.name, unitPrice: Number(item.price), quantity: 1, optionsTotal: 0 }]
    })
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)).filter((c) => c.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0)

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { toast.error("Panier vide"); return }
    const res = await fetch("/api/pos/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointOfSaleId: posId, tableId: tableId || null, orderType, items: cart, notes, clientName }),
    })
    if (res.ok) {
      toast.success("Commande creee")
      mutate()
      setOpen(false)
      setCart([])
      setTableId("")
      setNotes("")
      setClientName("")
    } else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const res = await fetch(`/api/pos/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success("Statut mis a jour"); mutate(); if (selectedOrder?.id === orderId) setSelectedOrder(null) }
    else { const d = await res.json(); toast.error(d.error || "Erreur") }
  }

  // Edit functions
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
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  const getNextStatusAction = (status: string) => {
    if (status === "received") return { label: "Preparer", nextStatus: "preparing", color: "bg-amber-600 hover:bg-amber-700" }
    if (status === "preparing") return { label: "Prete", nextStatus: "ready", color: "bg-emerald-600 hover:bg-emerald-700" }
    if (status === "ready") return { label: "Livrer", nextStatus: "delivered", color: "bg-primary hover:bg-primary/90" }
    return null
  }

  const filteredMenu = (menuItems || []).filter((m: { is_available: boolean; category_id: string }) => {
    if (!m.is_available) return false
    if (selectedCategory === "all") return true
    return m.category_id === selectedCategory
  })

  if (!posId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Selectionnez un point de vente</p>
            {locations?.length > 1 && (
              <Select value={posId} onValueChange={setPosId}>
                <SelectTrigger className="mt-4 w-[200px] border-border bg-secondary text-foreground">
                  <SelectValue placeholder="Point de vente" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  {(locations || []).map((l: { id: string; name: string }) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h1 className="font-serif text-xl font-bold text-foreground">Commandes</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} className="border-border text-foreground">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="mr-1 h-4 w-4" /> Nouvelle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">Nouvelle commande</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Type</Label>
                    <Select value={orderType} onValueChange={setOrderType}>
                      <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        <SelectItem value="dine_in">Sur place</SelectItem>
                        <SelectItem value="takeaway">A emporter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Table</Label>
                    <Select value={tableId} onValueChange={setTableId}>
                      <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        {(tables || []).filter((t: { status: string }) => t.status === "available").map((t: { id: string; table_number: string }) => (
                          <SelectItem key={t.id} value={t.id}>Table {t.table_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-card-foreground">Client</Label>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optionnel" className="border-border bg-secondary text-foreground" />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-card-foreground">Menu</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-8 w-[140px] border-border bg-secondary text-xs text-foreground">
                        <SelectValue placeholder="Categorie" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card text-card-foreground">
                        <SelectItem value="all">Toutes</SelectItem>
                        {(menuCategories || []).map((c: { id: string; name: string }) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
                    {filteredMenu.map((m: { id: string; name: string; price: number }) => (
                      <Button key={m.id} type="button" variant="outline" size="sm" onClick={() => addToCart(m)} className="h-auto justify-between border-border px-3 py-2 text-left text-foreground">
                        <span className="truncate text-xs">{m.name}</span>
                        <span className="ml-1 shrink-0 text-xs font-bold text-primary">{Number(m.price).toLocaleString()}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {cart.length > 0 && (
                  <Card className="border-border bg-secondary">
                    <CardContent className="p-3">
                      <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Panier</p>
                      {cart.map((c) => (
                        <div key={c.menuItemId} className="flex items-center justify-between py-1">
                          <span className="text-sm text-foreground">{c.itemName}</span>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => updateQty(c.menuItemId, -1)} className="h-7 w-7 p-0 text-muted-foreground"><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center text-sm font-medium text-foreground">{c.quantity}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => updateQty(c.menuItemId, 1)} className="h-7 w-7 p-0 text-muted-foreground"><Plus className="h-3 w-3" /></Button>
                            <span className="ml-2 w-20 text-right text-sm font-bold text-primary">{(c.quantity * c.unitPrice).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 border-t border-border pt-2 text-right text-lg font-bold text-primary">Total: {cartTotal.toLocaleString()} CDF</div>
                    </CardContent>
                  </Card>
                )}

                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="border-border bg-secondary text-foreground" />
                <Button type="submit" className="bg-primary text-primary-foreground" disabled={cart.length === 0}>
                  Valider la commande ({cartTotal.toLocaleString()} CDF)
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Status tabs - Left sidebar */}
        <div className="flex w-36 flex-col border-r border-border bg-secondary/30 p-2">
          {statusTabs.map((tab) => {
            const count = tab === "all" ? ordersList.filter((o: OrderType) => o.status !== "cancelled").length : countByStatus(tab)
            const config = tab === "all" ? { label: "Toutes", color: "text-foreground", icon: <ShoppingCart className="h-4 w-4" /> } : (statusConfig[tab] || statusConfig.received)
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedOrder(null) }}
                className={`mb-1 flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <span className="flex items-center gap-2">
                  {config.icon}
                  <span className="hidden sm:inline">{config.label}</span>
                </span>
                <Badge variant="secondary" className={`text-xs ${activeTab === tab ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}>{count}</Badge>
              </button>
            )
          })}
        </div>

        {/* Orders grid */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {filteredOrders.map((order: OrderType) => {
                const config = statusConfig[order.status] || statusConfig.received
                const nextAction = getNextStatusAction(order.status)
                return (
                  <Card
                    key={order.id}
                    className={`cursor-pointer border-2 transition-all hover:scale-[1.02] ${selectedOrder?.id === order.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{order.order_number}</span>
                        <Badge className={`${config.bgColor} ${config.color} border text-xs`}>
                          {config.icon}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {order.table_number && <span>T{order.table_number}</span>}
                        {order.client_name && <span>{order.client_name}</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="mb-2 text-xs text-muted-foreground">
                        {(order.items || []).slice(0, 2).map((item, i) => (
                          <div key={i}>{item.quantity}x {item.item_name}</div>
                        ))}
                        {(order.items || []).length > 2 && <div>+{(order.items || []).length - 2} autres...</div>}
                      </div>
                      <div className="mb-2 text-right font-bold text-primary">{Number(order.total).toLocaleString()} CDF</div>
                      {nextAction && (
                        <Button
                          size="sm"
                          className={`w-full ${nextAction.color} text-white`}
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, nextAction.nextStatus) }}
                        >
                          {nextAction.label}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {filteredOrders.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">Aucune commande</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Order detail panel */}
        {selectedOrder && (
          <div className="w-80 border-l border-border bg-card">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{selectedOrder.order_number}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)} className="text-muted-foreground">
                    <X className="h-4 w-4" />
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

                <div className="mb-4 space-y-1 text-sm">
                  {selectedOrder.table_number && <p className="text-muted-foreground">Table: <span className="text-foreground">{selectedOrder.table_number}</span></p>}
                  <p className="text-muted-foreground">Type: <span className="text-foreground">{selectedOrder.order_type === "dine_in" ? "Sur place" : "A emporter"}</span></p>
                  {selectedOrder.client_name && <p className="text-muted-foreground">Client: <span className="text-foreground">{selectedOrder.client_name}</span></p>}
                  <p className="text-muted-foreground">Heure: <span className="text-foreground">{new Date(selectedOrder.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></p>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Articles</p>
                  <div className="space-y-2">
                    {(selectedOrder.items || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.quantity}x {item.item_name}</span>
                        <span className="text-primary">{Number(item.total).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-border pt-3 text-right">
                    <span className="text-lg font-bold text-primary">{Number(selectedOrder.total).toLocaleString()} CDF</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Edit button */}
                  {!["delivered", "cancelled", "closed"].includes(selectedOrder.status) && (
                    <Button variant="outline" className="w-full justify-start border-border text-foreground" onClick={() => startEditingOrder(selectedOrder)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Modifier les articles
                    </Button>
                  )}

                  {/* Payment button */}
                  {!["cancelled", "closed"].includes(selectedOrder.status) && (
                    <Button variant="outline" className="w-full justify-start border-primary/50 text-primary" onClick={() => startPayment({ id: selectedOrder.id, total: Number(selectedOrder.total), order_number: selectedOrder.order_number })}>
                      <CreditCard className="mr-2 h-4 w-4" /> Payer
                    </Button>
                  )}

                  {/* Close button */}
                  {selectedOrder.status === "delivered" && (
                    <Button variant="outline" className="w-full justify-start border-violet-500/50 text-violet-400" onClick={() => checkAndCloseOrder(selectedOrder.id)}>
                      <Lock className="mr-2 h-4 w-4" /> Cloturer
                    </Button>
                  )}

                  {/* Status progression */}
                  {(() => {
                    const nextAction = getNextStatusAction(selectedOrder.status)
                    if (nextAction) {
                      return (
                        <Button className={`w-full ${nextAction.color} text-white`} onClick={() => updateOrderStatus(selectedOrder.id, nextAction.nextStatus)}>
                          {nextAction.label}
                        </Button>
                      )
                    }
                    return null
                  })()}

                  {/* Cancel button */}
                  {!["delivered", "cancelled", "closed"].includes(selectedOrder.status) && (
                    <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10" onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}>
                      <X className="mr-2 h-4 w-4" /> Annuler
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => { if (!open) { setEditingOrder(null); setEditCart([]) } }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-card-foreground">Modifier la commande</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-2 block text-card-foreground">Ajouter des articles</Label>
              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
                {(menuItems || []).filter((m: { is_available: boolean }) => m.is_available).map((m: { id: string; name: string; price: number }) => (
                  <Button key={m.id} type="button" variant="outline" size="sm" onClick={() => addToEditCart(m)} className="justify-between border-border text-foreground">
                    <span className="truncate">{m.name}</span>
                    <span className="ml-2 text-xs text-primary">{Number(m.price).toLocaleString()}</span>
                  </Button>
                ))}
              </div>
            </div>

            {editCart.length > 0 && (
              <Card className="border-border bg-secondary">
                <CardContent className="p-3">
                  <Label className="mb-2 block text-card-foreground">Articles de la commande</Label>
                  {editCart.map((c) => (
                    <div key={c.menuItemId} className="flex items-center justify-between py-1">
                      <span className="text-sm text-foreground">{c.itemName}</span>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => updateEditQty(c.menuItemId, -1)} className="h-6 w-6 p-0 text-muted-foreground"><Minus className="h-3 w-3" /></Button>
                        <span className="w-6 text-center text-sm text-foreground">{c.quantity}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => updateEditQty(c.menuItemId, 1)} className="h-6 w-6 p-0 text-muted-foreground"><Plus className="h-3 w-3" /></Button>
                        <span className="ml-2 text-sm text-primary">{(c.quantity * c.unitPrice).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-border pt-2 text-right font-bold text-primary">Total: {editCartTotal.toLocaleString()} CDF</div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEditingOrder(null); setEditCart([]) }} className="flex-1 border-border text-foreground">Annuler</Button>
              <Button onClick={handleSaveOrderItems} className="flex-1 bg-primary text-primary-foreground" disabled={editCart.length === 0}>
                <Check className="mr-2 h-4 w-4" /> Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={!!payingOrder} onOpenChange={(open) => { if (!open) { setPayingOrder(null); setAmountCash(""); setAmountMobile(""); setAmountCard("") } }}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="text-card-foreground">Paiement - {payingOrder?.order_number}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-lg font-bold text-primary">Total: {payingOrder?.total.toLocaleString()} CDF</p>

            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Serveur(se)</Label>
              <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue placeholder="Assigner un serveur" /></SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  {(waiters || []).map((w: { id: string; full_name: string }) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="cash">Especes</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Carte</SelectItem>
                  <SelectItem value="mixed">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(paymentMethod === "cash" || paymentMethod === "mixed") && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Montant Especes (CDF)</Label>
                <Input type="number" value={amountCash} onChange={(e) => setAmountCash(e.target.value)} className="border-border bg-secondary text-foreground" />
              </div>
            )}
            {(paymentMethod === "mobile_money" || paymentMethod === "mixed") && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Montant Mobile Money (CDF)</Label>
                <Input type="number" value={amountMobile} onChange={(e) => setAmountMobile(e.target.value)} className="border-border bg-secondary text-foreground" />
              </div>
            )}
            {(paymentMethod === "card" || paymentMethod === "mixed") && (
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Montant Carte (CDF)</Label>
                <Input type="number" value={amountCard} onChange={(e) => setAmountCard(e.target.value)} className="border-border bg-secondary text-foreground" />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPayingOrder(null)} className="flex-1 border-border text-foreground">Annuler</Button>
              <Button onClick={handlePayment} className="flex-1 bg-primary text-primary-foreground">
                <CreditCard className="mr-2 h-4 w-4" /> Confirmer le paiement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
