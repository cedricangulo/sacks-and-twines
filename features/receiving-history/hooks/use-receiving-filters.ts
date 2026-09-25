"use client"

import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs"
import {
  DEFAULT_DATE_RANGE,
  RECEIVING_DATE_RANGES,
  type ReceivingDateRange,
  type ReceivingStatus,
} from "../constants"

// URL query-state parsers for receiving history filters.
//
// `search` is parsed but applied client-side within the current page, matching
// the dispatch-history behaviour. `dateRange` and `supplierId` feed the Convex
// query args so the read stays an index range.
//
// There is no receiver filter: stock-in is owner-only and a second owner cannot
// be created, so it could only ever select everything. See the `listHistory`
// doc comment in `convex/batches/queries.ts`.
const receivingParsers = {
  search: parseAsString.withDefault(""),
  dateRange: parseAsStringEnum([
    "today",
    "this-week",
    "this-month",
    "last-month",
    "last-90-days",
  ] as const).withDefault(DEFAULT_DATE_RANGE),
  supplierId: parseAsString.withDefault("all"),
  status: parseAsStringEnum([
    "all",
    "active",
    "depleted",
    "voided",
  ] as const).withDefault("all"),
}

export type { ReceivingDateRange, ReceivingStatus }
export { RECEIVING_DATE_RANGES }

// Filter state for the receiving history page, synced to URL query params.
export function useReceivingFilters() {
  const [filters, setFilters] = useQueryStates(receivingParsers, {
    history: "replace",
  })

  const hasActiveFilters =
    filters.search !== "" ||
    filters.dateRange !== DEFAULT_DATE_RANGE ||
    filters.supplierId !== "all" ||
    filters.status !== "all"

  const clearFilters = () => {
    setFilters({
      search: "",
      dateRange: DEFAULT_DATE_RANGE,
      supplierId: "all",
      status: "all",
    })
  }

  return {
    search: filters.search,
    dateRange: filters.dateRange as ReceivingDateRange,
    supplierId: filters.supplierId,
    status: filters.status as ReceivingStatus,
    setFilters,
    hasActiveFilters,
    clearFilters,
  }
}
