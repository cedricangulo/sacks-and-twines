"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import type { Product } from "@/features/inventory/validation"
import { formatCurrency } from "@/lib/formatters"
import { getStockLevel } from "@/lib/stock-level"

// URL query-state parsers for inventory filters.
const inventoryParsers = {
  status: parseAsStringEnum(["all", "active", "archived"] as const).withDefault(
    "active"
  ),
  category: parseAsStringEnum(["all", "sacks", "twines"] as const).withDefault(
    "all"
  ),
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
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(inventoryParsers, {
    history: "replace",
  })

  const hasActiveFilters =
    search !== "" ||
    filters.status !== DEFAULT_STATUS ||
    filters.category !== "all" ||
    filters.stock !== "all"

  const clearFilters = () => {
    setSearch("")
    setFilters({ status: DEFAULT_STATUS, category: "all", stock: "all" })
  }

  return {
    search,
    setSearch,
    status: filters.status,
    category: filters.category,
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
  { search, category, stock }: InventoryClientFilters
): Product[] | undefined {
  if (!products) return undefined

  let result = products

  if (search) {
    const q = search.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.skuCode.toLowerCase().includes(q) ||
        p.keywords?.some((k) => k.toLowerCase().includes(q)) === true ||
        p.category.toLowerCase().includes(q) ||
        p.baseUom.toLowerCase().includes(q) ||
        p.currentQuantity.toString().toLowerCase().includes(q) ||
        formatCurrency(p.totalAssetValue).toString().toLowerCase().includes(q)
    )
  }

  if (category !== "all") {
    result = result.filter((p) => p.category === category)
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
