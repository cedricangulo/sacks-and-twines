"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

/**
 * Totals over a date range.
 *
 * `totalValue` is `number | null` rather than always a number: when the range is
 * truncated (see `truncated` below) the sum covers only the rows that fit under
 * the read ceiling, so presenting it as a real currency figure would be wrong.
 * Null means "not computed", which callers must render as unavailable rather
 * than as zero.
 */
export interface MonthlyAggregates {
  dispatchCount: number
  adjustmentCount: number
  totalItems: number
  totalValue: number | null
  /**
   * True when the range exceeded the server-side read ceiling and these totals
   * cover only part of it. Callers must surface this — an unmarked partial total
   * reads as a complete one.
   */
  truncated: boolean
}

/** Fetches aggregate counts and totals within a date range.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export function useMonthlyAggregates(startMs: number, endMs: number) {
  const { isAuthenticated } = useCurrentUser()

  const queryArgs = useMemo(
    () => (isAuthenticated ? ({ startMs, endMs } as const) : ("skip" as const)),
    [isAuthenticated, startMs, endMs]
  )

  const raw = useQuery(api.reports.queries.monthlyAggregates, queryArgs) as
    | MonthlyAggregates
    | undefined

  return {
    data: raw ?? emptyAggregates,
    isLoading: raw === undefined && isAuthenticated,
  }
}

const emptyAggregates: MonthlyAggregates = {
  dispatchCount: 0,
  adjustmentCount: 0,
  totalItems: 0,
  totalValue: 0,
  truncated: false,
}
