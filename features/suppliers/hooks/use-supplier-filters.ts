"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { Supplier } from "@/features/suppliers/validation"

// URL query-state parsers for supplier filters.
const supplierParsers = {
  status: parseAsStringEnum(["all", "active", "archived"] as const).withDefault(
    "all"
  ),
}

// Search and status filter state synced to URL query params with client-side filtering of the supplier list.
export function useSupplierFilters(suppliers: Supplier[] | undefined) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(supplierParsers, {
    history: "replace",
  })

  const hasActiveFilters = search !== "" || filters.status !== "all"

  const filtered = useMemo(() => {
    if (!suppliers) return undefined

    let result = suppliers

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.companyName.toLowerCase().includes(q) ||
          (s.contactPerson ?? "").toLowerCase().includes(q) ||
          (s.contactNumber ?? "").toLowerCase().includes(q) ||
          (s.address ?? "").toLowerCase().includes(q)
      )
    }

    if (filters.status !== "all") {
      const isArchived = filters.status === "archived"
      result = result.filter((s) => {
        const supplierArchived = s.archivedAt !== undefined
        return isArchived ? supplierArchived : !supplierArchived
      })
    }

    return result
  }, [suppliers, search, filters])

  const clearFilters = () => {
    setSearch("")
    setFilters({ status: "all" })
  }

  return {
    search,
    setSearch,
    status: filters.status,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  }
}
