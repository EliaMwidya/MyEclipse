"use client"

import React, { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Store, Users } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusMap: Record<string, { label: string; color: string }> = {
  available: { label: "Disponible", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  occupied: { label: "Occupee", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  reserved: { label: "Reservee", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
}

export default function PosTablesPage() {
  const { data: session } = useSWR("/api/auth/session", fetcher)
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [posId, setPosId] = useState("")

  useEffect(() => {
    if (session?.user?.point_of_sale_id) setPosId(session.user.point_of_sale_id)
    else if (locations?.length === 1) setPosId(locations[0].id)
  }, [session, locations])

  const { data: tables, mutate } = useSWR(posId ? `/api/pos/tables?posId=${posId}` : null, fetcher, { refreshInterval: 15000 })

  async function handleStatusChange(id: string, status: string) {
    const table = (tables || []).find((t: { id: string }) => t.id === id)
    if (!table) return
    await fetch(`/api/pos/tables/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: table.table_number, capacity: table.capacity, status }),
    })
    toast.success("Statut mis a jour")
    mutate()
  }

  const available = (tables || []).filter((t: { status: string }) => t.status === "available").length
  const occupied = (tables || []).filter((t: { status: string }) => t.status === "occupied").length
  const reserved = (tables || []).filter((t: { status: string }) => t.status === "reserved").length

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Tables</h1>
        <div className="flex items-center gap-3">
          {!session?.user?.point_of_sale_id && locations?.length > 1 && (
            <Select value={posId} onValueChange={setPosId}>
              <SelectTrigger className="w-[180px] border-border bg-secondary text-foreground">
                <SelectValue placeholder="Point de vente" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-card-foreground">
                {(locations || []).map((l: { id: string; name: string }) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2 text-xs">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{available} libres</Badge>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{occupied} occupees</Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{reserved} reservees</Badge>
          </div>
        </div>
      </div>

      {!posId ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">Selectionnez un point de vente</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {(tables || []).map((table: { id: string; table_number: string; capacity: number; status: string }) => {
            const st = statusMap[table.status] || statusMap.available
            return (
              <Card key={table.id} className="border-border bg-card transition-colors hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-card-foreground">{table.table_number}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {table.capacity} places
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className={`mb-3 ${st.color}`}>{st.label}</Badge>
                  <div className="flex gap-1">
                    {table.status !== "available" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(table.id, "available")} className="flex-1 border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/10">
                        Liberer
                      </Button>
                    )}
                    {table.status === "available" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(table.id, "occupied")} className="flex-1 border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/10">
                        Occuper
                      </Button>
                    )}
                    {table.status !== "reserved" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(table.id, "reserved")} className="flex-1 border-blue-500/30 text-xs text-blue-400 hover:bg-blue-500/10">
                        Reserver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {tables && tables.length === 0 && (
            <Card className="col-span-full border-border bg-card">
              <CardContent className="py-8 text-center text-muted-foreground">Aucune table configuree</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
