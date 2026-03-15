"use client"

import React from "react"

import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Bell, CheckCheck, AlertTriangle, Info, ShoppingCart } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const typeIcons: Record<string, React.ElementType> = {
  low_stock: AlertTriangle,
  new_order: ShoppingCart,
  system: Info,
}
const typeColors: Record<string, string> = {
  low_stock: "text-destructive",
  new_order: "text-primary",
  system: "text-blue-400",
}

export default function PosNotificationsPage() {
  const { data: notifications, mutate } = useSWR("/api/notifications", fetcher, { refreshInterval: 15000 })

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isRead: true }),
    })
    mutate()
  }

  async function markAllRead() {
    const unread = (notifications || []).filter((n: { is_read: boolean }) => !n.is_read)
    for (const n of unread) {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id, isRead: true }),
      })
    }
    toast.success("Toutes les notifications marquees comme lues")
    mutate()
  }

  const unreadCount = (notifications || []).filter((n: { is_read: boolean }) => !n.is_read).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} non lues</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="border-border text-foreground bg-transparent">
            <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {(notifications || []).map((n: { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }) => {
          const Icon = typeIcons[n.type] || Info
          const color = typeColors[n.type] || "text-muted-foreground"
          return (
            <Card key={n.id} className={`border-border bg-card transition-colors ${!n.is_read ? "border-l-2 border-l-primary" : ""}`}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`mt-0.5 shrink-0 ${color}`}><Icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-medium ${!n.is_read ? "text-card-foreground" : "text-muted-foreground"}`}>{n.title}</h3>
                    <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} className="shrink-0 text-xs text-muted-foreground">Lu</Button>
                )}
              </CardContent>
            </Card>
          )
        })}
        {(!notifications || notifications.length === 0) && (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Bell className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune notification</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
