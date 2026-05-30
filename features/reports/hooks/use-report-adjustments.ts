"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

/** A single stock adjustment entry as returned by the reports query. */
export interface ReportAdjustment {
  _id: Id<"stockAdjustments">
  _creationTime: number
  createdAt?: number
  batchId: Id<"batches">
  productId: Id<"products">
  userId: Id<"users">
  quantityAdjusted: number
  reason: "damaged" | "lost" | "recount" | "system_reversal"
  status: "applied" | "voided"
  productName: string
  batchCode: string
  userName: string
}

/** Fetches stock adjustments for a specific day range.
 * @param startMs - Start of the day range in milliseconds, or null to skip.
 * @param endMs - End of the day range in milliseconds, or null to skip.
 */
export function useAdjustmentsByDateRange(
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

  const result = useQuery(
    api.stock_adjustments.queries.listByDateRange,
    queryArgs
  ) as Array<Record<string, unknown>> | undefined

  return {
    data: (result ?? []) as unknown as ReportAdjustment[],
    isLoading: result === undefined && startMs !== null && endMs !== null,
  }
}
