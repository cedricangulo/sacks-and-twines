"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useBatches(productId: Id<"products"> | null) {
  const { isAuthenticated } = useConvexAuth()

  return useQuery(
    api.batches.queries.listByProduct,
    isAuthenticated && productId !== null ? { productId } : "skip"
  )
}
