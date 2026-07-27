"use client"

import { WarningCircleIcon, WarningIcon, XIcon } from "@phosphor-icons/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

const DISMISSED_KEY = "stock-banner-dismissed"

export function StockBanner() {
  const { isAuthenticated } = useCurrentUser()
  const stats = useQuery(
    api.dashboard.queries.summaryStats,
    isAuthenticated ? ({} as const) : ("skip" as const)
  )

  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true")
  }, [])

  if (dismissed || !stats) return null

  const outOfStock = stats.stockAlerts.filter((a) => a.currentQuantity === 0)
  const lowStock = stats.stockAlerts.filter((a) => a.currentQuantity > 0)

  if (outOfStock.length === 0 && lowStock.length === 0) return null

  const parts: string[] = []
  if (outOfStock.length > 0) {
    parts.push(`${outOfStock.length} out of stock`)
  }
  if (lowStock.length > 0) {
    parts.push(`${lowStock.length} low on stock`)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true")
    setDismissed(true)
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
