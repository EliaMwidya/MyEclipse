"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Download } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CHART_COLORS = ["hsl(38, 90%, 55%)", "hsl(200, 60%, 50%)", "hsl(150, 60%, 45%)", "hsl(0, 72%, 51%)", "hsl(280, 65%, 60%)"]

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

export default function ReportsPage() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const [from, setFrom] = useState(formatDate(thirtyDaysAgo))
  const [to, setTo] = useState(formatDate(today))
  const [posId, setPosId] = useState("")

  const posParam = posId && posId !== "all" ? `&posId=${posId}` : ""
  const { data: summaryData, isLoading: summaryLoading } = useSWR(
    `/api/reports?type=summary&from=${from}&to=${to}${posParam}`,
    fetcher
  )
  const { data: dailyData, isLoading: dailyLoading } = useSWR(
    `/api/reports?type=daily&from=${from}&to=${to}${posParam}`,
    fetcher
  )
  const { data: productsData, isLoading: productsLoading } = useSWR(
    `/api/reports?type=products&from=${from}&to=${to}${posParam}`,
    fetcher
  )
  const { data: posLocations } = useSWR("/api/pos-locations", fetcher)

  const summary = summaryData || {}
  const dailySales = (dailyData?.sales || []).reverse()
  const topProducts = productsData?.products || []

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Rapports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40 border-border bg-secondary text-foreground"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40 border-border bg-secondary text-foreground"
          />
          <Select value={posId} onValueChange={setPosId}>
            <SelectTrigger className="w-44 border-border bg-secondary text-foreground">
              <SelectValue placeholder="Tous les POS" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value="all">Tous les POS</SelectItem>
              {(posLocations || []).map((pos: { id: string; name: string }) => (
                <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d{"'"}affaires</CardTitle>
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {Number(summary.totalSales || 0).toLocaleString()} CDF
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Commandes</CardTitle>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">{summary.orderCount || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Depenses</CardTitle>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {Number(summary.totalExpenses || 0).toLocaleString()} CDF
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Benefice</CardTitle>
                <TrendingUp className={`h-5 w-5 ${Number(summary.profit || 0) >= 0 ? "text-emerald-500" : "text-destructive"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${Number(summary.profit || 0) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {Number(summary.profit || 0).toLocaleString()} CDF
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="mb-4 bg-secondary">
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Ventes journalieres
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Produits populaires
          </TabsTrigger>
          <TabsTrigger value="hours" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Distribution horaire
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Ventes journalieres</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : dailySales.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">Aucune donnee pour cette periode</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 18%)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      stroke="hsl(220, 10%, 55%)"
                      tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
                    />
                    <YAxis stroke="hsl(220, 10%, 55%)" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(220, 15%, 9%)", border: "1px solid hsl(220, 12%, 18%)", borderRadius: "8px", color: "hsl(40, 20%, 95%)" }}
                      labelFormatter={(v: string) => new Date(v).toLocaleDateString("fr-FR")}
                      formatter={(value: number) => [`${value.toLocaleString()} CDF`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="total_sales" name="Ventes" fill="hsl(38, 90%, 55%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cash_sales" name="Especes" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mobile_sales" name="Mobile Money" fill="hsl(200, 60%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Top produits par quantite</CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : topProducts.length === 0 ? (
                  <p className="py-16 text-center text-muted-foreground">Aucune donnee</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 18%)" />
                      <XAxis type="number" stroke="hsl(220, 10%, 55%)" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="item_name"
                        width={120}
                        stroke="hsl(220, 10%, 55%)"
                        tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(220, 15%, 9%)", border: "1px solid hsl(220, 12%, 18%)", borderRadius: "8px", color: "hsl(40, 20%, 95%)" }}
                      />
                      <Bar dataKey="total_qty" name="Quantite" fill="hsl(38, 90%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Revenus par produit</CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : topProducts.length === 0 ? (
                  <p className="py-16 text-center text-muted-foreground">Aucune donnee</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={topProducts.slice(0, 5)}
                        dataKey="total_revenue"
                        nameKey="item_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ item_name, percent }: { item_name: string; percent: number }) => `${item_name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {topProducts.slice(0, 5).map((_: unknown, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(220, 15%, 9%)", border: "1px solid hsl(220, 12%, 18%)", borderRadius: "8px", color: "hsl(40, 20%, 95%)" }}
                        formatter={(value: number) => [`${value.toLocaleString()} CDF`, "Revenu"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Distribution horaire des commandes</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (summary.hourlyDistribution || []).length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">Aucune donnee</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={summary.hourlyDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 18%)" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(v: number) => `${v}h`}
                      stroke="hsl(220, 10%, 55%)"
                      tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
                    />
                    <YAxis stroke="hsl(220, 10%, 55%)" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(220, 15%, 9%)", border: "1px solid hsl(220, 12%, 18%)", borderRadius: "8px", color: "hsl(40, 20%, 95%)" }}
                      labelFormatter={(v: number) => `${v}h00`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="orders" name="Commandes" stroke="hsl(38, 90%, 55%)" strokeWidth={2} dot={{ fill: "hsl(38, 90%, 55%)" }} />
                    <Line type="monotone" dataKey="revenue" name="Revenu" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ fill: "hsl(150, 60%, 45%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top Items table */}
      {(summary.topItems || []).length > 0 && (
        <Card className="mt-6 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-card-foreground">Top 5 articles vendus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Article</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Quantite</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Revenu</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topItems.map((item: { item_name: string; qty: number; revenue: number }, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 text-card-foreground">{item.item_name}</td>
                      <td className="py-2 text-right text-card-foreground">{item.qty}</td>
                      <td className="py-2 text-right font-medium text-primary">{Number(item.revenue).toLocaleString()} CDF</td>
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
