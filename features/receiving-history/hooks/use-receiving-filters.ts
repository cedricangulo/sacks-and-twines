"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { normalizeSearchTerm } from "@/lib/search"
import {
  DEFAULT_DATE_RANGE,
  RECEIVING_DATE_RANGE_VALUES,
  RECEIVING_DATE_RANGES,
  RECEIVING_STATUS_VALUES,
  type ReceivingDateRange,
  type ReceivingStatus,
} from "../constants"

// URL query-state parsers for receiving history filters.
//
// `search` is parsed separately below and applied client-side within the current
// page, matching the dispatch-history behaviour. `dateRange` and `supplierId`
// feed the Convex query args so the read stays an index range.
//
// There is no receiver filter: stock-in is owner-only and a second owner cannot
// be created, so it could only ever select everything. See the `listHistory`
// doc comment in `convex/batches/queries.ts`.
//
// The enum parsers read their literals from `constants.ts` rather than
// re-declaring them, so the URL parser cannot drift from the dropdown options.
// `parseAsStringEnum` takes a mutable array, so the `as const` tuples are
// spread — the element types stay the literals, which is what makes
// `useQueryStates` below infer `ReceivingStatus` rather than `string`.
const receivingParsers = {
  dateRange: parseAsStringEnum([...RECEIVING_DATE_RANGE_VALUES]).withDefault(
    DEFAULT_DATE_RANGE
  ),
  supplierId: parseAsString.withDefault("all"),
  status: parseAsStringEnum([...RECEIVING_STATUS_VALUES]).withDefault("all"),
}

export type { ReceivingDateRange, ReceivingStatus }
export { RECEIVING_DATE_RANGES }

// Filter state for the receiving history page, synced to URL query params.
export function useReceivingFilters() {
  // Search is its own `useQueryState` so it is independent of the dropdowns,
  // which are applied together via `useQueryStates` below. This is the shape
  // every other filter hook uses — inventory, products, suppliers,
  // dispatch-history, staff and audit-logs all declare `search` this way.
  //
  // No `limitUrlUpdates` here. `debounce` is only valid alongside
  // `shallow: false` (nuqs defaults `shallow` to true and warns otherwise), and
  // `shallow: false` routes every keystroke through `router.replace` instead of
  // a history-only write. Neither is worth paying: `search` is not part of the
  // Convex query args, so typing neither refetches nor resets pagination — it
  // costs one history write plus a filter over the loaded page.
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({ history: "replace" })
  )

  const [filters, setFilters] = useQueryStates(receivingParsers, {
    history: "replace",
  })

  // Normalized once here so the input and the results describe the same term.
  const search = normalizeSearchTerm(rawSearch)

  const hasActiveFilters =
    search !== "" ||
    filters.dateRange !== DEFAULT_DATE_RANGE ||
    filters.supplierId !== "all" ||
    filters.status !== "all"

  const clearFilters = () => {
    setSearch("")
    setFilters({
      dateRange: DEFAULT_DATE_RANGE,
      supplierId: "all",
      status: "all",
    })
  }

  return {
    search,
    setSearch,
    dateRange: filters.dateRange,
    supplierId: filters.supplierId,
    status: filters.status,
    setFilters,
    hasActiveFilters,
    clearFilters,
  }
}
