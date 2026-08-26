"use client"

import { WarningCircleIcon, WarningIcon, XIcon } from "@phosphor-icons/react"
import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

const DISMISSED_KEY = "stock-banner-dismissed"

function subscribeToDismissed(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getDismissedSnapshot(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true"
  } catch {
    return true
  }
}

/** Stock alert banner — shows out-of-stock / low-stock counts until dismissed. */
export function StockBanner() {
  const { isAuthenticated } = useCurrentUser()
  const stats = useQuery(
    api.dashboard.queries.summaryStats,
    isAuthenticated ? ({} as const) : ("skip" as const)
  )

  const dismissedFromStore = useSyncExternalStore(
    subscribeToDismissed,
    getDismissedSnapshot,
    () => true
  )
  const [localDismissed, setLocalDismissed] = useState(false)
  const dismissed = dismissedFromStore || localDismissed

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true")
    } catch {
      // ignore
    }
    setLocalDismissed(true)
    // Cross-tab sync
    window.dispatchEvent(new Event("storage"))
  }, [])

  // Single pass — avoids double `filter` iteration over `stockAlerts`.
  const { outOfStock, lowStock } = useMemo(() => {
    if (!stats) return { outOfStock: [], lowStock: [] } as const
    const out: typeof stats.stockAlerts = []
    const low: typeof stats.stockAlerts = []
    for (const a of stats.stockAlerts) {
      if (a.currentQuantity === 0) out.push(a)
      else if (a.currentQuantity > 0) low.push(a)
    }
    return { outOfStock: out, lowStock: low } as const
  }, [stats])

  if (dismissed || !stats) return null
  if (outOfStock.length === 0 && lowStock.length === 0) return null

  const parts: string[] = []
  if (outOfStock.length > 0) {
    parts.push(`${outOfStock.length} out of stock`)
  }
  if (lowStock.length > 0) {
    parts.push(`${lowStock.length} low on stock`)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 border-b bg-destructive/10 border-destructive/20">
      {outOfStock.length > 0 ? (
        <WarningCircleIcon
          weight="fill"
          className="size-5 shrink-0 text-destructive"
        />
      ) : (
        <WarningIcon weight="fill" className="size-5 shrink-0 text-amber-500" />
      )}
      <p className="flex-1 type-body-small text-destructive-foreground">
        {parts.join(", ")}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss stock alert"
      >
        <XIcon weight="bold" className="size-4" />
      </button>
    </div>
  )
}
