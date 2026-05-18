"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"

export function useProducts() {
  const { isAuthenticated } = useConvexAuth()
  return useQuery(api.products.queries.list, isAuthenticated ? {} : "skip")
}
