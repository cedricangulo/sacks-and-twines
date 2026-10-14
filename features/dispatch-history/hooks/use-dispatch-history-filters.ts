"use client"

import { parseAsString, useQueryState } from "nuqs"
import { useMemo } from "react"
import { formatCurrency, formatDateTime } from "@/lib/formatters"
import { matchesNumber, matchesSearch, normalizeSearchTerm } from "@/lib/search"
import type { Dispatch } from "../validation"

// Search state synced to the URL query param with client-side filtering of
// the dispatches list.
export function useDispatchHistoryFilters(dispatches: Dispatch[] | undefined) {
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  // Normalized once here so the input and the results describe the same term.
  const search = normalizeSearchTerm(rawSearch)

  const hasActiveFilters = search !== ""

  const filtered = useMemo(() => {
    if (!dispatches) return undefined

    let result = dispatches

    // Every rendered column is searchable: OR number, customer ref, dispatched-by,
    // item count, total quantity, total value and the dispatch date.
    // OR number was previously unreachable, which is the identifier operators
    // most often have in hand when something goes wrong.
    if (search) {
      result = result.filter(
        (d) =>
          matchesSearch(d.orNumber, search) ||
          matchesSearch(d.customerReference, search) ||
          matchesSearch(d.userName, search) ||
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

    return result
  }, [dispatches, search])

  const clearFilters = () => {
    setSearch("")
  }

  return {
    search,
    setSearch,
    filtered,
    hasActiveFilters,
    clearFilters,
  }
}
