"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

/** Fetches all batches for a product via Convex query. */
export function useBatches(productId: Id<"products"> | null) {
  const { isAuthenticated } = useCurrentUser()

  return useQuery(
    api.batches.queries.listByProduct,
    isAuthenticated && productId !== null ? { productId } : "skip"
  )
}
