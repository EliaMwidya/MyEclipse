"use client"

import { useState, use } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ShoppingCart, Plus, Minus, X, UtensilsCrossed, Send } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CartItem {
  menuItemId: string; itemName: string; unitPrice: number; quantity: number
}

export default function ClientMenuPage({ params }: { params: Promise<{ posId: string }> }) {
  const { posId } = use(params)
  const { data, error } = useSWR(`/api/client/menu?posId=${posId}`, fetcher)
  const [cart, setCart] = useState<CartItem[]>([])
  const [clientName, setClientName] = useState("")
  const [notes, setNotes] = useState("")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: orderStatus } = useSWR(orderId ? `/api/client/order?orderId=${orderId}` : null, fetcher, { refreshInterval: 5000 })

  if (error) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Erreur de chargement</div>
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>

  const { categories, items, settings } = data
  const filteredItems = selectedCategory ? items.filter((i: { category_id: string }) => i.category_id === selectedCategory) : items
  const cartTotal = cart.reduce((sum: number, c: CartItem) => sum + c.quantity * c.unitPrice, 0)
  const cartCount = cart.reduce((sum: number, c: CartItem) => sum + c.quantity, 0)

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, itemName: item.name, unitPrice: Number(item.price), quantity: 1 }]
    })
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0))
  }

  async function handleSubmitOrder() {
    if (cart.length === 0) return
    const res = await fetch("/api/client/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointOfSaleId: posId, items: cart, clientName: clientName || "Client", notes }),
    })
    if (res.ok) {
      const d = await res.json()
      setOrderId(d.orderId)
      setOrderNumber(d.orderNumber)
      setCart([])
      setShowCart(false)
      toast.success("Commande envoyee !")
    } else { toast.error("Erreur lors de l'envoi") }
  }

  const statusLabels: Record<string, string> = {
    received: "Recue", preparing: "En preparation", ready: "Prete !", delivered: "Livree", cancelled: "Annulee",
  }

  // If order was placed, show tracking
  if (orderId && orderStatus) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <img src="/images/eclipse-20lounge-20bar-20blanc-20-281-29.png" alt="Eclipse" className="mx-auto mb-4 h-16 object-contain" />
            <h1 className="font-serif text-2xl font-bold text-foreground">Suivi de commande</h1>
            <p className="mt-1 text-sm text-muted-foreground">{orderNumber}</p>
          </div>

          <Card className="mb-4 border-primary/30 bg-card">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Statut actuel</p>
              <p className="mt-2 text-2xl font-bold text-primary">{statusLabels[orderStatus.status] || orderStatus.status}</p>
              {orderStatus.status === "preparing" && (
                <p className="mt-2 text-sm text-muted-foreground">Votre commande est en cours de preparation...</p>
              )}
              {orderStatus.status === "ready" && (
                <p className="mt-2 text-sm text-foreground font-medium">Votre commande est prete !</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <h3 className="mb-2 font-medium text-card-foreground">Articles commandes</h3>
              {(orderStatus.items || []).map((item: { id: string; item_name: string; quantity: number; total: number }) => (
                <div key={item.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">{item.quantity}x {item.item_name}</span>
                  <span className="text-card-foreground">{Number(item.total).toLocaleString()} CDF</span>
                </div>
              ))}
              <div className="mt-2 border-t border-border pt-2 text-right font-bold text-primary">
                {Number(orderStatus.total).toLocaleString()} CDF
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => { setOrderId(null); setOrderNumber(null) }} variant="outline" className="mt-4 w-full border-border text-foreground">
            Nouvelle commande
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/eclipse-20lounge-20bar-20blanc-20-281-29.png" alt="Eclipse" className="h-8 object-contain" />
            <h1 className="font-serif text-lg font-bold text-foreground">{settings?.restaurant_name || "Eclipse"}</h1>
          </div>
          <Button variant="outline" size="sm" className="relative border-primary text-primary bg-transparent" onClick={() => setShowCart(true)}>
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Categories */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          <Button size="sm" variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-primary text-primary-foreground" : "border-border text-foreground"}>
            Tout
          </Button>
          {(categories || []).map((cat: { id: string; name: string }) => (
            <Button key={cat.id} size="sm" variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "border-border text-foreground whitespace-nowrap"}>
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="flex flex-col gap-3">
          {filteredItems.map((item: { id: string; name: string; description: string; price: number; image_url: string; category_name: string }) => {
            const inCart = cart.find((c) => c.menuItemId === item.id)
            return (
              <Card key={item.id} className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    {item.image_url ? (
                      <img src={item.image_url || "/placeholder.svg"} alt={item.name} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <UtensilsCrossed className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-card-foreground">{item.name}</h3>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                    <p className="mt-1 font-bold text-primary">{Number(item.price).toLocaleString()} CDF</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => updateQty(item.id, -1)} className="h-7 w-7 p-0 text-muted-foreground"><Minus className="h-3 w-3" /></Button>
                      <span className="w-5 text-center text-sm text-foreground">{inCart.quantity}</span>
                      <Button size="sm" variant="ghost" onClick={() => updateQty(item.id, 1)} className="h-7 w-7 p-0 text-muted-foreground"><Plus className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(item)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Cart bottom bar */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card p-3">
          <div className="mx-auto max-w-md">
            <Button onClick={() => setShowCart(true)} className="w-full bg-primary text-primary-foreground">
              <ShoppingCart className="mr-2 h-4 w-4" /> Voir le panier ({cartCount}) - {cartTotal.toLocaleString()} CDF
            </Button>
          </div>
        </div>
      )}

      {/* Cart overlay */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-serif text-lg font-bold text-foreground">Votre panier</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCart(false)} className="text-muted-foreground"><X className="h-5 w-5" /></Button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {cart.map((c) => (
              <div key={c.menuItemId} className="flex items-center justify-between border-b border-border/50 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.itemName}</p>
                  <p className="text-xs text-muted-foreground">{c.unitPrice.toLocaleString()} CDF</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => updateQty(c.menuItemId, -1)} className="h-7 w-7 p-0 text-muted-foreground"><Minus className="h-3 w-3" /></Button>
                  <span className="w-5 text-center text-sm text-foreground">{c.quantity}</span>
                  <Button size="sm" variant="ghost" onClick={() => updateQty(c.menuItemId, 1)} className="h-7 w-7 p-0 text-muted-foreground"><Plus className="h-3 w-3" /></Button>
                  <span className="ml-2 text-sm font-medium text-primary">{(c.quantity * c.unitPrice).toLocaleString()}</span>
                </div>
              </div>
            ))}

            <div className="mt-4 flex flex-col gap-3">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Votre nom" className="border-border bg-secondary text-foreground" />
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (allergies, preferences...)" className="border-border bg-secondary text-foreground" />
            </div>
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total HT</span>
              <span className="font-bold text-foreground">{cartTotal.toLocaleString()} CDF</span>
            </div>
            <Button onClick={handleSubmitOrder} className="w-full bg-primary text-primary-foreground" disabled={cart.length === 0}>
              <Send className="mr-2 h-4 w-4" /> Envoyer la commande
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
