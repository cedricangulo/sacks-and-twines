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

/** Fetches calendar summary and buckets timestamps by day-of-month.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export function useCalendarSummary(startMs: number, endMs: number) {
  const { isAuthenticated } = useCurrentUser()

  const queryArgs = useMemo(
    () => (isAuthenticated ? ({ startMs, endMs } as const) : ("skip" as const)),
    [isAuthenticated, startMs, endMs]
  )

  const raw = useQuery(api.reports.queries.calendarSummary, queryArgs) as
    | { dispatchTimestamps: number[]; adjustmentTimestamps: number[] }
    | undefined

  const isLoading = raw === undefined

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

  return { summary, isLoading }
}
