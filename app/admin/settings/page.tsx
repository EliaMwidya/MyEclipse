"use client"

import React from "react"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Save } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SettingsPage() {
  const { data, mutate } = useSWR("/api/settings", fetcher)
  const [form, setForm] = useState({
    restaurant_name: "",
    restaurant_address: "",
    restaurant_phone: "",
    tva_rate: "18",
    currency: "CDF",
  })

  useEffect(() => {
    if (data) {
      setForm({
        restaurant_name: data.restaurant_name || "",
        restaurant_address: data.restaurant_address || "",
        restaurant_phone: data.restaurant_phone || "",
        tva_rate: data.tva_rate || "18",
        currency: data.currency || "CDF",
      })
    }
  }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Parametres enregistres")
      mutate()
    } else {
      toast.error("Erreur lors de la sauvegarde")
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-foreground">Parametres generaux</h1>

      <Card className="max-w-2xl border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Configuration du restaurant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Nom du restaurant</Label>
              <Input value={form.restaurant_name} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Adresse</Label>
              <Input value={form.restaurant_address} onChange={(e) => setForm({ ...form, restaurant_address: e.target.value })} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Telephone</Label>
              <Input value={form.restaurant_phone} onChange={(e) => setForm({ ...form, restaurant_phone: e.target.value })} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Taux TVA (%)</Label>
                <Input type="number" value={form.tva_rate} onChange={(e) => setForm({ ...form, tva_rate: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-card-foreground">Devise</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="border-border bg-secondary text-foreground" />
              </div>
            </div>
            <Button type="submit" className="w-fit bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
