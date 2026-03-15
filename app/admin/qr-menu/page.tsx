"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { QrCode, ExternalLink, Copy } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function QrMenuPage() {
  const { data: locations } = useSWR("/api/pos-locations", fetcher)
  const [selectedPos, setSelectedPos] = useState("")

  const menuUrl = typeof window !== "undefined" && selectedPos
    ? `${window.location.origin}/menu/${selectedPos}`
    : ""

  function copyUrl() {
    navigator.clipboard.writeText(menuUrl)
    toast.success("URL copiee")
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">QR Menu Client</h1>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Generateur de QR Menu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Select value={selectedPos} onValueChange={setSelectedPos}>
              <SelectTrigger className="w-full border-border bg-secondary text-foreground md:w-[300px]">
                <SelectValue placeholder="Selectionnez un point de vente" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-card-foreground">
                {(locations || []).map((l: { id: string; name: string }) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPos && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-4">
                  <QrCode className="h-5 w-5 shrink-0 text-primary" />
                  <code className="flex-1 break-all text-sm text-foreground">{menuUrl}</code>
                  <Button variant="ghost" size="sm" onClick={copyUrl} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button asChild className="bg-primary text-primary-foreground">
                    <a href={menuUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Voir le menu</a>
                  </Button>
                  <Button asChild variant="outline" className="border-border text-foreground bg-transparent">
                    <a href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`} target="_blank" rel="noopener noreferrer" download>
                      <QrCode className="mr-2 h-4 w-4" /> Telecharger QR Code
                    </a>
                  </Button>
                </div>
                <div className="flex items-center justify-center rounded-lg border border-border bg-foreground/5 p-8">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(menuUrl)}&bgcolor=0f1117&color=d4920a`}
                    alt="QR Code"
                    className="h-[250px] w-[250px]"
                    crossOrigin="anonymous"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Imprimez ce QR code et placez-le sur les tables pour permettre aux clients de commander directement depuis leur telephone.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
