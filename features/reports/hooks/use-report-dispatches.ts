"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

// A single dispatch entry as returned by the reports query.
export interface ReportDispatch {
  _id: Id<"dispatches">
  _creationTime: number
  createdAt?: number
  userId: Id<"users">
  customerReference?: string
  orNumber?: string
  status: "completed" | "voided"
  userName?: string
  itemCount?: number
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

  return {
    data: (result ?? []) as unknown as ReportDispatch[],
    isLoading: result === undefined && startMs !== null && endMs !== null,
  }
}
