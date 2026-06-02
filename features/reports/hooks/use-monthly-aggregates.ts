"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export interface MonthlyAggregates {
  dispatchCount: number
  adjustmentCount: number
  totalItems: number
  totalValue: number
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

  return { data: raw ?? emptyAggregates, isLoading: raw === undefined }
}

const emptyAggregates: MonthlyAggregates = {
  dispatchCount: 0,
  adjustmentCount: 0,
  totalItems: 0,
  totalValue: 0,
}
