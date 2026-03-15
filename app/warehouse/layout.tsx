import React from "react"
import { WarehouseSidebar } from "@/components/warehouse-sidebar"

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <WarehouseSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
