"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

// Shared stable identity for the loading state — `(result ?? [])` mints a
// fresh array every render, which cascades into fresh pagination objects and
// table data arrays downstream (see `calendar-detail-panel.tsx`).
const EMPTY: never[] = []

// A single dispatch entry as returned by the reports query.
// `userName`, `itemCount`, `totalQuantity` and `totalValue` are denormalized
// onto the dispatch doc at write time, so the query's `...dispatch` spread
// carries them without any extra read.
export interface ReportDispatch {
  _id: Id<"dispatches">
  _creationTime: number
  createdAt?: number
  userId: Id<"users">
  customerReference?: string
  orNumber?: string
  userName?: string
  itemCount?: number
  totalQuantity?: number
  totalValue: number
}

/**
 * Fetches dispatches for a specific day range.
 * @param startMs - Start of the day range in milliseconds, or null to skip.
 * @param endMs - End of the day range in milliseconds, or null to skip.
 */
export function useDispatchesByDateRange(
  startMs: number | null,
  endMs: number | null
) {
  const { isAuthenticated } = useCurrentUser()

  const queryArgs = useMemo(
    () =>
      isAuthenticated && startMs !== null && endMs !== null
        ? ({
            startMs,
            endMs,
          } as const)
        : ("skip" as const),
    [isAuthenticated, startMs, endMs]
  )

  const result = useQuery(api.dispatches.queries.listByDateRange, queryArgs) as
    | Array<Record<string, unknown>>
    | undefined

  const hasRange = startMs !== null && endMs !== null

  return {
    data: (result ?? EMPTY) as unknown as ReportDispatch[],
    isLoading: result === undefined && hasRange,
  }
}
