"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import { formatCurrency, formatDateTime } from "@/lib/formatters"
import { matchesNumber, matchesSearch, normalizeSearchTerm } from "@/lib/search"
import type { Dispatch } from "../validation"

// URL query-state parsers for dispatch-history filters.
const filterParsers = {
  status: parseAsStringEnum([
    "all",
    "completed",
    "voided",
  ] as const).withDefault("all"),
}

// Search/filter state synced to URL query params with client-side filtering of the dispatches list.
export function useDispatchHistoryFilters(dispatches: Dispatch[] | undefined) {
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
  })

  // Normalized once here so the input and the results describe the same term.
  const search = normalizeSearchTerm(rawSearch)

  const hasActiveFilters = search !== "" || filters.status !== "all"

  const filtered = useMemo(() => {
    if (!dispatches) return undefined

    let result = dispatches

    // Every rendered column is searchable: OR number, customer ref, dispatched-by,
    // status, item count, total quantity, total value and the dispatch date.
    // OR number was previously unreachable, which is the identifier operators
    // most often have in hand when something goes wrong.
    if (search) {
      result = result.filter(
        (d) =>
          matchesSearch(d.orNumber, search) ||
          matchesSearch(d.customerReference, search) ||
          matchesSearch(d.userName, search) ||
          matchesSearch(d.status, search) ||
          matchesNumber(d.itemCount, search) ||
          matchesNumber(d.totalQuantity, search) ||
          matchesNumber(d.totalValue, search) ||
          matchesSearch(
            d.totalValue === undefined ? "" : formatCurrency(d.totalValue),
            search
          ) ||
          matchesSearch(formatDateTime(d.createdAt ?? d._creationTime), search)
      )
    }

    if (filters.status !== "all") {
      result = result.filter((d) => d.status === filters.status)
    }

    return result
  }, [dispatches, search, filters.status])

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
