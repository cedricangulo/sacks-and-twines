"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export interface CalendarSummaryEntry {
  day: number
  dispatchCount: number
  adjustmentCount: number
}

/**
 * Buckets dispatch/adjustment timestamps by day-of-month for the calendar grid.
 *
 * Reads `reports.queries.monthlyAggregates`, which now also returns the
 * timestamps — they used to come from a separate `calendarSummary` query that
 * re-read the same month range (and the same adjustment range) on every reports
 * load. When the stats bar's range matches this one, the shared query cache
 * collapses both into a single invocation. See docs/PERFORMANCE-AUDIT.md P5.
 *
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export function useCalendarSummary(startMs: number, endMs: number) {
  const { isAuthenticated } = useCurrentUser()

  const queryArgs = useMemo(
    () => (isAuthenticated ? ({ startMs, endMs } as const) : ("skip" as const)),
    [isAuthenticated, startMs, endMs]
  )

  const raw = useQuery(api.reports.queries.monthlyAggregates, queryArgs) as
    | {
        dispatchTimestamps: number[]
        adjustmentTimestamps: number[]
        truncated: boolean
      }
    | undefined

  const isLoading = raw === undefined && isAuthenticated

  // A truncated range yields only part of the timestamps, so some days that had
  // activity are simply absent from `summary` — an unmarked gap the grid renders
  // as "no dispatches". Callers should surface this alongside the summary.
  const truncated = raw?.truncated ?? false

  // Bucket timestamps by day-of-month using client's local timezone.
  const summary = useMemo(() => {
    if (!raw) return []
    const buckets: Record<
      number,
      { dispatchCount: number; adjustmentCount: number }
    > = {}

    for (const ts of raw.dispatchTimestamps) {
      const day = new Date(ts).getDate()
      if (!buckets[day]) buckets[day] = { dispatchCount: 0, adjustmentCount: 0 }
      buckets[day].dispatchCount++
    }
    for (const ts of raw.adjustmentTimestamps) {
      const day = new Date(ts).getDate()
      if (!buckets[day]) buckets[day] = { dispatchCount: 0, adjustmentCount: 0 }
      buckets[day].adjustmentCount++
    }

    return Object.entries(buckets).map(([day, counts]) => ({
      day: Number(day),
      ...counts,
    }))
  }, [raw])

  return { summary, isLoading, truncated }
}
