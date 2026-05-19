"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Dispatch } from "../validation"

function todayRange() {
  const now = new Date()
  const startMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const endMs = startMs + 86400000 - 1
  return { startMs, endMs }
}

interface UseDispatchesArgs {
  createdByUserId?: string
}

export function useDispatches(args: UseDispatchesArgs) {
  const { isAuthenticated } = useConvexAuth()

  const today = useMemo(() => todayRange(), [])

  const queryArgs = useMemo(
    () =>
      isAuthenticated
        ? ({
            startMs: today.startMs,
            endMs: today.endMs,
            createdByUserId: (args.createdByUserId &&
            args.createdByUserId !== "all"
              ? args.createdByUserId
              : undefined) as Id<"users"> | undefined,
          } as const)
        : ("skip" as const),
    [isAuthenticated, args.createdByUserId, today]
  )

  const result = useQuery(api.dispatches.queries.list, queryArgs) as
    | Array<Record<string, unknown>>
    | undefined

  return {
    data: (result ?? []) as unknown as Dispatch[],
    isLoading: result === undefined,
  }
}
