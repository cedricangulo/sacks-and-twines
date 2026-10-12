"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import {
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_UOM_VALUES,
} from "@/features/inventory/constants"
import type { Product } from "@/features/inventory/validation"
import { formatCurrency, formatDateTime } from "@/lib/formatters"
import { matchesNumber, matchesSearch, normalizeSearchTerm } from "@/lib/search"
import { getStockLevel } from "@/lib/stock-level"

// URL query-state parsers for inventory filters.
//
// `parseAsStringEnum` takes a mutable array, so the `as const` tuples are
// spread. Spreading (rather than re-typing the literals) is what keeps the
// parser from drifting from `PRODUCT_CATEGORY_VALUES` again — see the note on
// that constant.
const inventoryParsers = {
  status: parseAsStringEnum(["all", "active", "archived"] as const).withDefault(
    "active"
  ),
  category: parseAsStringEnum([...PRODUCT_CATEGORY_VALUES]).withDefault("all"),
  uom: parseAsStringEnum([...PRODUCT_UOM_VALUES]).withDefault("all"),
  stock: parseAsStringEnum([
    "all",
    "in_stock",
    "low_stock",
    "out_of_stock",
  ] as const).withDefault("all"),
}

const DEFAULT_STATUS = "active"

/** The subset of filter state that is applied client-side. */
export interface InventoryClientFilters {
  search: string
  category: string
  uom: string
  stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
}

/**
 * Search, category and stock filter state synced to URL query params.
 *
 * `status` is returned but deliberately **not** filtered here — it is pushed to
 * the `products.queries.list` args so the `by_status` index does the work. That
 * also means the hook must not take `products` as an argument: the caller needs
 * `status` to build the query args, and the query result to filter. Use
 * `filterProducts` below once the query resolves.
 */
export function useInventoryFilters() {
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(inventoryParsers, {
    history: "replace",
  })

  // The raw URL value is normalized once, here, rather than inside the search
  // predicate. The input renders this value, so the box and the results are
  // always describing the same term — see `normalizeSearchTerm`.
  const search = normalizeSearchTerm(rawSearch)

  const hasActiveFilters =
    search !== "" ||
    filters.status !== DEFAULT_STATUS ||
    filters.category !== "all" ||
    filters.uom !== "all" ||
    filters.stock !== "all"

  const clearFilters = () => {
    setSearch("")
    setFilters({
      status: DEFAULT_STATUS,
      category: "all",
      uom: "all",
      stock: "all",
    })
  }

  return {
    search,
    setSearch,
    status: filters.status,
    category: filters.category,
    uom: filters.uom,
    stock: filters.stock,
    setFilters,
    hasActiveFilters,
    clearFilters,
  }
}

/**
 * Applies the client-side inventory filters. `status` is intentionally absent —
 * it is applied by the server via the `by_status` index.
 *
 * Returns `undefined` while the query is unresolved, which is the page's
 * loading signal.
 */
export function filterProducts(
  products: Product[] | undefined,
  { search, category, uom, stock }: InventoryClientFilters
): Product[] | undefined {
  if (!products) return undefined

  let result = products

  if (search) {
    // Every rendered column is searchable: name, SKU, keywords, category, unit,
    // quantity, asset value, created date and status. Numbers and currency are
    // matched against their *formatted* form, so what the user reads in the
    // cell is what they can type. The trade is that a term like "1" matches any
    // value containing a 1 — deliberate, since matching a bare `₱1,200.00`
    // requires matching "1200" and the formatted string is the only honest way
    // to bridge the two.
    result = result.filter(
      (p) =>
        matchesSearch(p.name, search) ||
        matchesSearch(p.skuCode, search) ||
        p.keywords?.some((k) => matchesSearch(k, search)) === true ||
        matchesSearch(p.category, search) ||
        matchesSearch(p.baseUom, search) ||
        matchesNumber(p.currentQuantity, search) ||
        matchesNumber(p.totalAssetValue, search) ||
        matchesSearch(formatCurrency(p.totalAssetValue), search) ||
        matchesSearch(formatDateTime(p.createdAt ?? p._creationTime), search) ||
        matchesSearch(p.status, search)
    )
  }

  if (category !== "all") {
    result = result.filter((p) => p.category === category)
  }

  if (uom !== "all") {
    result = result.filter((p) => p.baseUom === uom)
  }

  if (stock !== "all") {
    result = result.filter((p) => {
      // Shares its definition with the dashboard banner and stat tiles, so a
      // dashboard count always matches what this filter returns.
      const level = getStockLevel(p.currentQuantity, p.lowStockThreshold)
      switch (stock) {
        case "in_stock":
          return level === "in_stock"
        case "low_stock":
          return level === "low_stock"
        case "out_of_stock":
          return level === "out_of_stock"
        default:
          return true
      }
    })
  }

  return result
}
