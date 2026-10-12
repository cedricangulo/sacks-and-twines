"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { StaffUser } from "@/features/users/components/staff-table"
import { formatDateTime } from "@/lib/formatters"
import { matchesSearch, normalizeSearchTerm } from "@/lib/search"

// URL query-state parsers for staff filters.
const staffParsers = {
  status: parseAsStringEnum([
    "all",
    "active",
    "deactivated",
  ] as const).withDefault("all"),
}

// Search and status filter state synced to URL query params with client-side filtering of the staff list.
export function useStaffFilters(staff: StaffUser[] | undefined) {
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(staffParsers, {
    history: "replace",
  })

  // Normalized once here so the input and the results describe the same term.
  const search = normalizeSearchTerm(rawSearch)

  const hasActiveFilters = search !== "" || filters.status !== "all"

  const filtered = useMemo(() => {
    if (!staff) return undefined

    let result = staff

    // Name, email, status and the Created date are all rendered, so all four are
    // searchable. The date matches its formatted form.
    if (search) {
      result = result.filter(
        (s) =>
          matchesSearch(s.name, search) ||
          matchesSearch(s.email, search) ||
          matchesSearch(s.status, search) ||
          matchesSearch(formatDateTime(s._creationTime), search)
      )
    }

    if (filters.status !== "all") {
      result = result.filter((s) => s.status === filters.status)
    }

    return result
  }, [staff, search, filters])

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
