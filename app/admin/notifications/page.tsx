"use client"

import React from "react"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Bell, BellOff, CheckCheck, ShoppingCart, AlertTriangle, Package, Info } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  new_order: { icon: ShoppingCart, color: "text-primary", label: "Nouvelle commande" },
  low_stock: { icon: AlertTriangle, color: "text-amber-500", label: "Stock bas" },
  stock_entry: { icon: Package, color: "text-emerald-500", label: "Approvisionnement" },
  order_ready: { icon: ShoppingCart, color: "text-emerald-500", label: "Commande prete" },
  general: { icon: Info, color: "text-muted-foreground", label: "General" },
}

export default function NotificationsPage() {
  const { data, isLoading, mutate } = useSWR("/api/notifications", fetcher, { refreshInterval: 15000 })

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    mutate()
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    toast.success("Toutes les notifications ont ete marquees comme lues")
    mutate()
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{unreadCount} non lues</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="border-border text-foreground bg-transparent">
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer lu
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BellOff className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-card-foreground">Aucune notification</p>
            <p className="mt-1 text-sm text-muted-foreground">Vous recevrez des notifications pour les commandes, stocks bas, etc.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notif: {
            id: string
            type: string
            title: string
            message: string
            is_read: boolean
            order_number: string | null
            created_at: string
          }) => {
            const config = typeConfig[notif.type] || typeConfig.general
            const Icon = config.icon
            return (
              <Card
                key={notif.id}
                className={`border-border bg-card transition-colors ${!notif.is_read ? "border-l-2 border-l-primary" : ""}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${notif.is_read ? "text-muted-foreground" : "text-card-foreground"}`}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{notif.message}</p>
                        )}
                        {notif.order_number && (
                          <p className="mt-0.5 text-xs text-primary">Commande {notif.order_number}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(notif.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markRead(notif.id)}
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          >
                            Marquer lu
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
