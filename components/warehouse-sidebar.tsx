"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import {
  Package,
  Layers,
  TruckIcon,
  Warehouse,
  ArrowRightLeft,
  ClipboardList,
  LogOut,
  Bell,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const navItems = [
  { href: "/warehouse", label: "Stock", icon: ClipboardList },
  { href: "/warehouse/products", label: "Produits", icon: Package },
  { href: "/warehouse/categories", label: "Categories", icon: Layers },
  { href: "/warehouse/suppliers", label: "Fournisseurs", icon: TruckIcon },
  { href: "/warehouse/entries", label: "Approvisionnements", icon: Warehouse },
  { href: "/warehouse/exits", label: "Sorties", icon: ArrowRightLeft },
]

export function WarehouseSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSWR("/api/auth/session", fetcher)
  const { data: notifications } = useSWR("/api/notifications?unread=true", fetcher)

  const unreadCount = notifications?.length || 0

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Deconnexion reussie")
    router.push("/")
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <img
          src="/images/eclipse-20lounge-20bar-20blanc-20-281-29.png"
          alt="Eclipse"
          className="h-8 w-8 object-contain"
        />
        <div>
          <h2 className="font-serif text-base font-bold leading-tight text-sidebar-foreground">Eclipse</h2>
          <p className="text-[9px] tracking-widest text-primary uppercase">Entrepot</p>
        </div>
      </div>

      {session?.user && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{session.user.full_name}</p>
          <p className="text-[10px] text-muted-foreground">Magasinier</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/warehouse" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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

        <div className="mt-6">
          <Link
            href="/warehouse/notifications"
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/warehouse/notifications"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Bell className="h-4 w-4 shrink-0" />
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">{unreadCount}</Badge>
            )}
          </Link>
        </div>
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
