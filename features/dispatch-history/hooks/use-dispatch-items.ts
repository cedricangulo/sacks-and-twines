"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useDispatchItems(dispatchId: Id<"dispatches"> | null) {
  const { isAuthenticated } = useConvexAuth()

  return useQuery(
    api.dispatches.queries.getItemsByDispatch,
    isAuthenticated && dispatchId !== null ? { dispatchId } : "skip"
  )
}
