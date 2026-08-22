"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { forecastWeeklyDemand } from "@/lib/forecast"

export function useDashboardData(
  monthStartMs: number,
  monthEndMs: number,
  velocityStartMs?: number,
  velocityEndMs?: number,
  tzOffsetMs?: number
) {
  const { isAuthenticated } = useCurrentUser()
  const vStart = velocityStartMs ?? monthStartMs
  const vEnd = velocityEndMs ?? monthEndMs
  const tzOffset = tzOffsetMs ?? 0

  const statsArgs = useMemo(
    () => (isAuthenticated ? ({} as const) : ("skip" as const)),
    [isAuthenticated]
  )

  const dispatchArgs = useMemo(
    () =>
      isAuthenticated
        ? ({
            startMs: monthStartMs,
            endMs: monthEndMs,
            timezoneOffsetMs: tzOffset,
          } as const)
        : ("skip" as const),
    [isAuthenticated, monthStartMs, monthEndMs, tzOffset]
  )

  const velocityArgs = useMemo(
    () =>
      isAuthenticated
        ? ({
            startMs: vStart,
            endMs: vEnd,
            timezoneOffsetMs: tzOffset,
          } as const)
        : ("skip" as const),
    [isAuthenticated, vStart, vEnd, tzOffset]
  )

  const demandArgs = useMemo(
    () =>
      isAuthenticated
        ? ({
            startMs: monthStartMs,
            endMs: monthEndMs,
            timezoneOffsetMs: tzOffset,
          } as const)
        : ("skip" as const),
    [isAuthenticated, monthStartMs, monthEndMs, tzOffset]
  )

  // productMovement doesn't need timezoneOffsetMs — it aggregates per-product
  // totals, not per-day/hour buckets, so the raw UTC range is sufficient.
  const productMovementArgs = useMemo(
    () =>
      isAuthenticated
        ? ({ startMs: monthStartMs, endMs: monthEndMs } as const)
        : ("skip" as const),
    [isAuthenticated, monthStartMs, monthEndMs]
  )

  const stats = useQuery(api.dashboard.queries.summaryStats, statsArgs)
  const dispatchVolume = useQuery(
    api.dashboard.queries.dailyDispatchVolume,
    dispatchArgs
  )
  const velocity = useQuery(api.dashboard.queries.weeklyVelocity, velocityArgs)
  const demand = useQuery(api.dashboard.queries.weeklyDemand, demandArgs)
  const productMovement = useQuery(
    api.dashboard.queries.productMovement,
    productMovementArgs
  )

  const forecast = useMemo(() => {
    if (!demand || demand.length === 0) return []
    return forecastWeeklyDemand(demand, monthStartMs)
  }, [demand, monthStartMs])

  return {
    stats,
    statsLoading: stats === undefined && isAuthenticated,
    dispatchVolume: dispatchVolume ?? [],
    dispatchLoading: dispatchVolume === undefined && isAuthenticated,
    velocity: velocity ?? [],
    velocityLoading: velocity === undefined && isAuthenticated,
    forecast,
    forecastLoading: demand === undefined && isAuthenticated,
    productMovement: productMovement ?? [],
    productMovementLoading: productMovement === undefined && isAuthenticated,
  }
}
