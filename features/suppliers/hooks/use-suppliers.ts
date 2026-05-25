"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export function useSuppliers() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery(api.suppliers.queries.list, isAuthenticated ? {} : "skip")
}

export function useSupplierOptions() {
  const { isAuthenticated } = useCurrentUser()
  const data = useQuery(
    api.suppliers.queries.listActiveOptions,
    isAuthenticated ? {} : "skip"
  )
  return data?.map((s) => ({ id: s._id, name: s.companyName })) ?? null
}
