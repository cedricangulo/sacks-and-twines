"use client"

import {
  ArrowRightIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useConvex } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { getStockLevel } from "@/lib/stock-level"
import { Button } from "./ui/button"

const DISMISSED_KEY = "stock-banner-dismissed"

/**
 * How long a dismissal suppresses the banner.
 *
 * Previously the flag was a bare `"true"` that nothing ever cleared, so a single
 * click silenced every future stock alert in that browser permanently — the
 * worst possible failure for a signal meant to catch a product running out. The
 * dismissal is now a timestamp that expires, so an owner quieting the banner
 * once stops it re-rendering on every navigation, but it still comes back if a
 * product goes out of stock tomorrow and nobody was around to click it today.
 */
const DISMISS_TTL_MS = 12 * 60 * 60 * 1000

function subscribeToDismissed(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

/**
 * True only while a *recent* dismissal is still in effect. An expired or
 * unparseable value reads as not-dismissed rather than erroring, so a corrupt
 * entry cannot suppress the banner.
 */
function getDismissedSnapshot(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (raw === null) return false
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return false
    return Date.now() - dismissedAt < DISMISS_TTL_MS
  } catch {
    // No localStorage (private mode / blocked). Don't hide the banner.
    return false
  }
}

type StockAlerts = FunctionReturnType<typeof api.dashboard.queries.stockAlerts>

/**
 * Stock alert banner — shows out-of-stock / low-stock counts until dismissed.
 *
 * Each count is a separate link into the matching filtered inventory view. The
 * dismiss control is a *sibling* of those links rather than a child, so the
 * links stay valid anchors.
 *
 * This is a **point-in-time** read via `useConvex().query(...)`, not a `useQuery`
 * subscription. The banner is mounted in the shared dashboard layout, so a live
 * subscription would re-run on every product patch — and because Convex has no
 * field projections, that means every dispatch, adjustment and stock-in in the
 * system, on pages that show no stock data. Triggers re-read on mount, on tab
 * focus/visibility, and on arriving at `/inventory` instead; an explicit dismiss
 * is persisted in localStorage with a 12-hour expiry so it cannot silence alerts
 * indefinitely. See docs/PERFORMANCE-AUDIT.md P4.
 */
export function StockBanner() {
  const { isAuthenticated, isLoading: isUserLoading } = useCurrentUser()
  const convex = useConvex()
  const [alerts, setAlerts] = useState<StockAlerts>()

  const dismissedFromStore = useSyncExternalStore(
    subscribeToDismissed,
    getDismissedSnapshot,
    // Server render: assume not dismissed so the banner is present in the
    // initial HTML and hydration agrees with it.
    () => false
  )
  const [localDismissed, setLocalDismissed] = useState(false)
  const dismissed = dismissedFromStore || localDismissed

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // ignore — the local state below still hides it for this session
    }
    setLocalDismissed(true)
    // Cross-tab sync
    window.dispatchEvent(new Event("storage"))
  }, [])

  // Point-in-time read, refreshed at the two moments a stale count would
  // actually mislead someone:
  //   - returning to the tab (the common case: dispatch stock, switch away,
  //     come back, and the banner still shows the pre-dispatch numbers)
  //   - arriving on /inventory, where the user acts on what the banner says
  //
  // Deliberately NOT a `useQuery` subscription: Convex has no field
  // projections, so a live subscription to this query re-runs on every product
  // patch — every dispatch, adjustment and stock-in in the system — on pages
  // that display no stock data at all. See docs/PERFORMANCE-AUDIT.md P4.
  //
  // Cost is one `products.by_status` scan per refresh. At the seed's 11 active
  // products that is a few KB; it does grow linearly with catalog size, so the
  // refresh triggers are kept narrow rather than firing on every navigation.
  const refresh = useCallback(() => {
    if (!isAuthenticated) return
    let cancelled = false
    void convex.query(api.dashboard.queries.stockAlerts, {}).then(
      (result) => {
        if (!cancelled) setAlerts(result)
      },
      () => {
        if (!cancelled) setAlerts([])
      }
    )
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, convex])

  useEffect(() => refresh(), [refresh])

  // Refetch when the tab regains focus or becomes visible again.
  useEffect(() => {
    if (!isAuthenticated) return
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isAuthenticated, refresh])

  // Refetch on arriving at /inventory only — not on every route change, which
  // would make each page navigation in the dashboard a fresh catalog scan.
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  useEffect(() => {
    const arrivedAtInventory =
      pathname === "/inventory" && prevPathname.current !== "/inventory"
    prevPathname.current = pathname
    if (arrivedAtInventory) refresh()
  }, [pathname, refresh])

  // Single pass — avoids double `filter` iteration over the alerts. Buckets match
  // `/inventory?stock=` filters via `getStockLevel`, so a chip never links to a
  // view that excludes the products it counted.
  const { outOfStock, lowStock } = useMemo(() => {
    const out: NonNullable<typeof alerts> = []
    const low: NonNullable<typeof alerts> = []
    for (const a of alerts ?? []) {
      const level = getStockLevel(a.currentQuantity, a.lowStockThreshold)
      if (level === "out_of_stock") out.push(a)
      else if (level === "low_stock") low.push(a)
    }
    return { outOfStock: out, lowStock: low } as const
  }, [alerts])

  if (dismissed || isUserLoading || !alerts) return null
  if (outOfStock.length === 0 && lowStock.length === 0) return null

  const hasOut = outOfStock.length > 0
  const hasLow = lowStock.length > 0

  const chipClass =
    "group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 type-body-small font-medium ring-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div
      role="region"
      aria-label="Stock alerts"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-destructive/20 bg-destructive/10 px-4 py-2 mb-4"
    >
      {hasOut ? (
        <WarningCircleIcon
          weight="fill"
          className="size-5 shrink-0 text-destructive"
        />
      ) : (
        <WarningIcon weight="fill" className="size-5 shrink-0 text-amber-500" />
      )}

      <span className="type-body-small text-destructive-foreground">
        Needs attention
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {hasOut ? (
          <Link
            href="/inventory?stock=out_of_stock"
            transitionTypes={["nav-forward"]}
            data-cuelume-press="soft"
            data-cuelume-release="soft"
            aria-label={`${outOfStock.length} products out of stock. View out of stock inventory`}
            className={`${chipClass} bg-destructive/10 text-destructive-foreground ring-destructive/25 hover:bg-destructive/20`}
          >
            <span className="font-mono tabular-nums">{outOfStock.length}</span>
            <span>out of stock</span>
            <ArrowRightIcon
              weight="bold"
              aria-hidden="true"
              className="size-3 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : null}

        {hasLow ? (
          <Link
            href="/inventory?stock=low_stock"
            transitionTypes={["nav-forward"]}
            data-cuelume-press="soft"
            data-cuelume-release="soft"
            aria-label={`${lowStock.length} products low on stock. View low stock inventory`}
            className={`${chipClass} bg-amber-500/10 text-amber-700 ring-amber-500/30 hover:bg-amber-500/20 dark:text-amber-300`}
          >
            <span className="font-mono tabular-nums">{lowStock.length}</span>
            <span>low on stock</span>
            <ArrowRightIcon
              weight="bold"
              aria-hidden="true"
              className="size-3 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={handleDismiss}
        className="ml-auto"
        size="icon"
        variant="destructive"
        aria-label="Dismiss stock alert"
      >
        <XIcon weight="bold" />
      </Button>
    </div>
  )
}
