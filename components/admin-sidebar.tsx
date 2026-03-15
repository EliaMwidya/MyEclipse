"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Warehouse,
  Package,
  TruckIcon,
  ArrowRightLeft,
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  Receipt,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Store,
  QrCode,
  Bell,
  Layers,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"

const navGroups = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Entrepot",
    items: [
      { href: "/admin/warehouse/products", label: "Produits", icon: Package },
      { href: "/admin/warehouse/categories", label: "Categories", icon: Layers },
      { href: "/admin/warehouse/suppliers", label: "Fournisseurs", icon: TruckIcon },
      { href: "/admin/warehouse/entries", label: "Approvisionnements", icon: Warehouse },
      { href: "/admin/warehouse/exits", label: "Sorties", icon: ArrowRightLeft },
      { href: "/admin/warehouse/stock", label: "Stock Entrepot", icon: ClipboardList },
    ],
  },
  {
    label: "Point de Vente",
    items: [
      { href: "/admin/pos/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/admin/pos/orders", label: "Commandes", icon: ShoppingCart },
      { href: "/admin/pos/tables", label: "Tables", icon: Store },
      { href: "/admin/pos/billing", label: "Facturation", icon: Receipt },
      { href: "/admin/pos/cash", label: "Caisse", icon: DollarSign },
      { href: "/admin/pos/stock", label: "Stock POS", icon: Package },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Utilisateurs", icon: Users },
      { href: "/admin/pos-locations", label: "Points de vente", icon: Store },
      { href: "/admin/reports", label: "Rapports", icon: BarChart3 },
      { href: "/admin/accounting", label: "Comptabilite", icon: BookOpen },
      { href: "/admin/qr-menu", label: "QR Menu", icon: QrCode },
      { href: "/admin/settings", label: "Parametres", icon: Settings },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Deconnexion reussie")
    router.push("/")
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <img
          src="/images/eclipse-20lounge-20bar-20blanc-20-281-29.png"
          alt="Eclipse"
          className="h-9 w-9 object-contain"
        />
        <div>
          <h2 className="font-serif text-lg font-bold leading-tight text-sidebar-foreground">Eclipse</h2>
          <p className="text-[10px] tracking-widest text-muted-foreground uppercase">Lunc Bar</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </button>
      </div>
    </aside>
  )
}
