"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export function useBatchDetail(batchId: Id<"batches"> | null) {
  const { isAuthenticated } = useCurrentUser()

  return useQuery(
    api.batches.queries.getById,
    isAuthenticated && batchId !== null ? { batchId } : "skip"
  )
}
