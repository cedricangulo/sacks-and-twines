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
import { StockBanner } from "./stock-banner"

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
            aria-label="Go back"
            variant="ghost"
            size="icon"
            className="shrink-0"
            nativeButton={false}
            render={<Link href={backHref} transitionTypes={["nav-back"]} />}
          >
            <ArrowLeftIcon weight="fill" />
          </Button>
        ) : null}
        <h2 className="font-semibold truncate type-h4">{displayTitle}</h2>
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
            {/* `overflow-y-auto` implies `overflow-x: auto`, which put a second
                horizontal scroller next to the one every table already owns
                (`components/ui/table.tsx`). `overflow-x-clip` keeps the vertical
                scroll without letting the shell scroll sideways. */}
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-clip">
              {children}
            </main>
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
          {/* `min-w-0` is load-bearing. `SidebarInset` is a flex item on the main
            axis of `sidebar-wrapper`'s row, so `min-width: auto` resolves to its
            content-based minimum — and an auto-layout table of `whitespace-nowrap`
            columns has a min-content width equal to the sum of all its columns.
            Without this the inset grew to the width of the widest table and pushed
            the overflow out to `<body>`, which is what made the *page* scroll
            sideways. `overflow-x-clip` on `<main>` below could not prevent it: the
            inset had already been sized wide, so there was nothing left to clip.
            Do not "fix" this with `overflow: hidden` on `sidebar-wrapper` — that
            only clips, leaving `scrollWidth > clientWidth` behind, and the scroll
            returns as soon as a wide popover renders. */}
          <SidebarInset className="min-w-0">
            <header
              className="flex h-16 shrink-0 items-center gap-2 overflow-hidden transition-[width,height] ease-linear"
              style={{ viewTransitionName: "site-header" }}
            >
              <div className="flex items-center flex-1 min-w-0 gap-4 px-4">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <PageHeaderBar />
              </div>
            </header>
            <StockBanner />
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
              {/* `overflow-x-clip` (not `hidden`) so the document still scrolls vertically
                while no page can scroll horizontally — wide tables own their own
                scroller. See the staff branch above. */}
              <main
                className="min-w-0 overflow-x-clip"
                suppressHydrationWarning
              >
                {children}
              </main>
            </ViewTransition>
          </SidebarInset>
        </SidebarProvider>
      </PageHeaderProvider>
    )
  }

  return <LoadingPage />
}
