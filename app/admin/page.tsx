"use client"

import React from "react"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, DollarSign, Users, TrendingUp, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  variant?: "default" | "warning" | "success"
}) {
  const iconColors = {
    default: "text-primary",
    warning: "text-amber-500",
    success: "text-emerald-500",
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 font-serif text-2xl font-bold text-foreground">Tableau de bord</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = data || {}

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-foreground">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventes du jour"
          value={`${stats.todaySales ?? 0} CDF`}
          icon={DollarSign}
          description="Total des ventes aujourd'hui"
          variant="success"
        />
        <StatCard
          title="Commandes du jour"
          value={stats.todayOrders ?? 0}
          icon={ShoppingCart}
          description="Commandes recues aujourd'hui"
        />
        <StatCard
          title="Produits"
          value={stats.totalProducts ?? 0}
          icon={Package}
          description="Produits en catalogue"
        />
        <StatCard
          title="Utilisateurs"
          value={stats.totalUsers ?? 0}
          icon={Users}
          description="Utilisateurs actifs"
        />
        <StatCard
          title="Stock bas"
          value={stats.lowStock ?? 0}
          icon={AlertTriangle}
          description="Produits sous le seuil"
          variant="warning"
        />
        <StatCard
          title="Commandes en cours"
          value={stats.pendingOrders ?? 0}
          icon={TrendingUp}
          description="En preparation ou recues"
        />
        <StatCard
          title="Chiffre du mois"
          value={`${stats.monthSales ?? 0} CDF`}
          icon={DollarSign}
          description="Total ventes ce mois"
          variant="success"
        />
        <StatCard
          title="Points de vente"
          value={stats.totalPOS ?? 0}
          icon={Package}
          description="Points de vente actifs"
        />
      </div>

      {stats.recentOrders && stats.recentOrders.length > 0 && (
        <Card className="mt-6 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Commandes recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">N</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Statut</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Total</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order: { order_number: string; status: string; total: number; created_at: string }) => (
                    <tr key={order.order_number} className="border-b border-border/50">
                      <td className="py-2 text-card-foreground">{order.order_number}</td>
                      <td className="py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          order.status === "delivered" ? "bg-emerald-500/20 text-emerald-400" :
                          order.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                          "bg-primary/20 text-primary"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-card-foreground">{order.total} CDF</td>
                      <td className="py-2 text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
