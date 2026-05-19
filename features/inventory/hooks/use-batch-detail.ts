"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useBatchDetail(batchId: Id<"batches"> | null) {
  const { isAuthenticated } = useConvexAuth()

  return useQuery(
    api.batches.queries.getById,
    isAuthenticated && batchId !== null ? { batchId } : "skip"
  )
}
