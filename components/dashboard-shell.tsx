"use client"

import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ForbiddenPage } from "@/components/forbidden-page"
import { StaffHeader } from "@/components/staff-header"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import LoadingPage from "./loading-page"

interface Props {
  children: ReactNode
  initialRole?: string
}

const OWNER_ONLY_ROOTS = [
  "/inventory",
  "/suppliers",
  "/users",
  "/dashboard",
  "/reports",
]

function isOwnerOnlyPath(pathname: string): boolean {
  if (pathname === "/audit-logs" || pathname === "/audit-logs/") return true
  if (
    pathname.startsWith("/audit-logs/") &&
    !pathname.startsWith("/audit-logs/personal")
  )
    return true
  return OWNER_ONLY_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(root + "/")
  )
}

export function DashboardShell({ children, initialRole }: Props) {
  const { user } = useCurrentUser()
  const pathname = usePathname()

  const role = user?.role ?? initialRole

  if (!role) return <LoadingPage />

  if (role === "staff") {
    if (isOwnerOnlyPath(pathname)) {
      return <ForbiddenPage />
    }

    return (
      <div className="flex min-h-screen flex-col">
        <StaffHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <main suppressHydrationWarning>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
