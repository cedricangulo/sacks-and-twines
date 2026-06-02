"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

// Fetches all suppliers (including archived) via Convex.
export function useSuppliers() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery(api.suppliers.queries.list, isAuthenticated ? {} : "skip")
}

// Fetches active supplier options (id + name pairs) for combobox use.
export function useSupplierOptions() {
  const { isAuthenticated } = useCurrentUser()
  const data = useQuery(
    api.suppliers.queries.listActiveOptions,
    isAuthenticated ? {} : "skip"
  )
  return data?.map((s) => ({ id: s._id, name: s.companyName })) ?? null
}
