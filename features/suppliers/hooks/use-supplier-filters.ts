"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { Supplier } from "@/features/suppliers/validation"
import { matchesSearch, normalizeSearchTerm } from "@/lib/search"

// URL query-state parsers for supplier filters.
const supplierParsers = {
  status: parseAsStringEnum(["all", "active", "archived"] as const).withDefault(
    "all"
  ),
}

// Search and status filter state synced to URL query params with client-side filtering of the supplier list.
export function useSupplierFilters(suppliers: Supplier[] | undefined) {
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(supplierParsers, {
    history: "replace",
  })

  // Normalized once here so the input and the results describe the same term.
  const search = normalizeSearchTerm(rawSearch)

  const hasActiveFilters = search !== "" || filters.status !== "all"

  const filtered = useMemo(() => {
    if (!suppliers) return undefined

    let result = suppliers

    // Every rendered column is searchable, plus the derived Status badge so
    // "archived" and "active" both find rows.
    if (search) {
      result = result.filter(
        (s) =>
          matchesSearch(s.companyName, search) ||
          matchesSearch(s.contactPerson, search) ||
          matchesSearch(s.contactNumber, search) ||
          matchesSearch(s.address, search) ||
          matchesSearch(
            s.archivedAt === undefined ? "active" : "archived",
            search
          )
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
