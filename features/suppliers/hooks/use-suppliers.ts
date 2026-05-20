"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export function useSuppliers() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery(api.suppliers.queries.list, isAuthenticated ? {} : "skip")
}
