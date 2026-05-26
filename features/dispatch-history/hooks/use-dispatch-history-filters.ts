"use client"

import {
  debounce,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { Dispatch } from "../validation"

const filterParsers = {
  status: parseAsStringEnum([
    "all",
    "completed",
    "voided",
  ] as const).withDefault("all"),
}

export function useDispatchHistoryFilters(dispatches: Dispatch[] | undefined) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
      shallow: false,
      limitUrlUpdates: debounce(300),
    })
  )

  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
    shallow: false,
  })

  const hasActiveFilters = search !== "" || filters.status !== "all"

  const filtered = useMemo(() => {
    if (!dispatches) return undefined

    let result = dispatches

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          (d.customerReference?.toLowerCase() ?? "").includes(q) ||
          d.userName.toLowerCase().includes(q) ||
          d.itemCount.toString().toLowerCase().includes(q)
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
