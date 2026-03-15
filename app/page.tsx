"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { LogIn, UserPlus, Wine } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [setupForm, setSetupForm] = useState({ email: "", password: "", fullName: "" })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur de connexion")
        return
      }
      toast.success(`Bienvenue, ${data.user.full_name}`)
      const role = data.user.role
      if (role === "super_admin" || role === "manager") {
        router.push("/admin")
      } else if (role === "cashier" || role === "waiter") {
        router.push("/pos")
      } else if (role === "warehouse") {
        router.push("/warehouse")
      } else {
        router.push("/admin")
      }
    } catch {
      toast.error("Impossible de se connecter au serveur")
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupForm),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la configuration")
        return
      }
      toast.success("Administrateur cree avec succes ! Connectez-vous maintenant.")
    } catch {
      toast.error("Impossible de se connecter au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-24 w-24">
            <img
              src="/images/eclipse-20lounge-20bar-20blanc-20-281-29.png"
              alt="Eclipse Lunc Bar"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-foreground">Eclipse</h1>
            <p className="text-sm tracking-widest text-muted-foreground uppercase">Lunc Bar</p>
          </div>
        </div>

        <Card className="w-full border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-center text-sm text-muted-foreground">Systeme de gestion</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2 bg-secondary">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LogIn className="mr-2 h-4 w-4" />
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="setup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Configuration
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="login-email" className="text-foreground">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="admin@eclipse.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="login-password" className="text-foreground">Mot de passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Votre mot de passe"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="setup">
                <form onSubmit={handleSetup} className="flex flex-col gap-4">
                  <p className="text-xs text-muted-foreground">
                    {"Creez le premier compte administrateur. Cette action ne peut etre effectuee qu'une seule fois."}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="setup-name" className="text-foreground">Nom complet</Label>
                    <Input
                      id="setup-name"
                      placeholder="Jean Dupont"
                      value={setupForm.fullName}
                      onChange={(e) => setSetupForm({ ...setupForm, fullName: e.target.value })}
                      required
                      className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="setup-email" className="text-foreground">Email</Label>
                    <Input
                      id="setup-email"
                      type="email"
                      placeholder="admin@eclipse.com"
                      value={setupForm.email}
                      onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })}
                      required
                      className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="setup-password" className="text-foreground">Mot de passe</Label>
                    <Input
                      id="setup-password"
                      type="password"
                      placeholder="Mot de passe securise"
                      value={setupForm.password}
                      onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })}
                      required
                      className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {loading ? "Configuration..." : "Creer le compte admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Wine className="h-3 w-3" /> Eclipse Lunc Bar Management System
        </p>
      </div>
    </div>
  )
}
