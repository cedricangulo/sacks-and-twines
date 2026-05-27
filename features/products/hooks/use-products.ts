"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

/** Fetches all products (including archived) via Convex. */
export function useProducts() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery(api.products.queries.list, isAuthenticated ? {} : "skip")
}

/** Fetches only active (non-archived) products via Convex. */
export function useActiveProducts() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery(
    api.products.queries.listActive,
    isAuthenticated ? {} : "skip"
  )
}
