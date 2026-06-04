"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { forbidden, usePathname } from "next/navigation"
import { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  PageHeaderProvider,
  usePageHeader,
} from "@/components/page-header-context"
import { StaffHeader } from "@/components/staff-header"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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

function PageHeaderBar() {
  const { title, backHref, actions } = usePageHeader()

  if (!title) return null

  return (
    <>
      <Separator orientation="vertical" className="h-10 shrink-0" />
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {backHref ? (
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href={backHref}>
              <ArrowLeft />
            </Link>
          </Button>
        ) : null}
        <h2 className="font-semibold type-lg truncate">{title}</h2>
      </div>
      {actions ? (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {actions}
        </div>
      ) : null}
    </>
  )
}

export function DashboardShell({ children, initialRole }: Props) {
  const { user } = useCurrentUser()
  const pathname = usePathname()

  const role = user?.role ?? initialRole

  if (!role) return <LoadingPage />

  if (role === "staff") {
    if (isOwnerOnlyPath(pathname)) {
      return forbidden()
    }

    return (
      <PageHeaderProvider>
        <div className="flex min-h-screen flex-col">
          <StaffHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </PageHeaderProvider>
    )
  }

  return (
    <PageHeaderProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b overflow-hidden transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center flex-1 min-w-0 gap-4 px-4">
              <SidebarTrigger className="-ml-1 shrink-0" />
              <PageHeaderBar />
            </div>
          </header>
          <main suppressHydrationWarning>{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </PageHeaderProvider>
  )
}
