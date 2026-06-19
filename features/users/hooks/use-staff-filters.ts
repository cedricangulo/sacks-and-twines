"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { StaffUser } from "@/features/users/components/staff-table"

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
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(staffParsers, {
    history: "replace",
  })

  const hasActiveFilters = search !== "" || filters.status !== "all"

  const filtered = useMemo(() => {
    if (!staff) return undefined

    let result = staff

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          (s.name ?? "").toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
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
