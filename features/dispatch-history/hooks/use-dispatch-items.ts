"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

// Fetches dispatch items (products in a dispatch) via Convex query, skipping for unauthenticated users.
export function useDispatchItems(dispatchId: Id<"dispatches"> | null) {
  const { isAuthenticated } = useCurrentUser()

  return useQuery(
    api.dispatches.queries.getItemsByDispatch,
    isAuthenticated && dispatchId !== null ? { dispatchId } : "skip"
  )
}
