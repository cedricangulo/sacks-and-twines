"use client"

import { ArrowLeftIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, ViewTransition } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  PageHeaderProvider,
  usePageHeader,
} from "@/components/page-header-context"
import { StaffHeader } from "@/components/staff-header"
import { Button } from "@/components/ui/button"
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

function titleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return ""
  const last = segments[segments.length - 1]
  return last
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

function PageHeaderBar() {
  const { title, backHref, actions } = usePageHeader()
  const pathname = usePathname()

  const displayTitle = title || titleFromPathname(pathname)
  if (!displayTitle) return null

  return (
    <>
      <div className="flex items-center flex-1 min-w-0 gap-2">
        {backHref ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            render={<Link href={backHref} transitionTypes={["nav-back"]} />}
          >
            <ArrowLeftIcon weight="fill" />
          </Button>
        ) : null}
        <h2 className="font-semibold truncate type-md">{displayTitle}</h2>
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

  const role = user?.role ?? initialRole

  if (!role) return <LoadingPage />

  if (role === "staff") {
    return (
      <PageHeaderProvider>
        <div className="flex flex-col min-h-screen">
          <StaffHeader />
          <ViewTransition
            enter={{
              "nav-forward": "nav-forward",
              "nav-back": "nav-back",
              default: "x-fade",
            }}
            exit={{
              "nav-forward": "nav-forward",
              "nav-back": "nav-back",
              default: "x-fade",
            }}
            default="x-fade"
          >
            <main className="flex-1 overflow-y-auto">{children}</main>
          </ViewTransition>
        </div>
      </PageHeaderProvider>
    )
  }

  if (role === "owner") {
    return (
      <PageHeaderProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header
              className="flex h-16 shrink-0 items-center gap-2 overflow-hidden transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
              style={{ viewTransitionName: "site-header" }}
            >
              <div className="flex items-center flex-1 min-w-0 gap-4 px-4">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <PageHeaderBar />
              </div>
            </header>
            <ViewTransition
              enter={{
                "nav-forward": "nav-forward",
                "nav-back": "nav-back",
                default: "x-fade",
              }}
              exit={{
                "nav-forward": "nav-forward",
                "nav-back": "nav-back",
                default: "x-fade",
              }}
              default="x-fade"
            >
              <main suppressHydrationWarning>{children}</main>
            </ViewTransition>
          </SidebarInset>
        </SidebarProvider>
      </PageHeaderProvider>
    )
  }

  return <LoadingPage />
}
