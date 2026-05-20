"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export function useProducts() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery(api.products.queries.list, isAuthenticated ? {} : "skip")
}
