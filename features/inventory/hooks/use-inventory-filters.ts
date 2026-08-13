"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { Product } from "@/features/inventory/validation"
import { formatCurrency } from "@/lib/formatters"

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

// Search, status, category, and stock filter state synced to URL query params with client-side filtering.
export function useInventoryFilters(products: Product[] | undefined) {
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

  const filtered = useMemo(() => {
    if (!products) return undefined

    let result = products

    // Search filter
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

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((p) => p.status === filters.status)
    }

    // Category filter
    if (filters.category !== "all") {
      result = result.filter((p) => p.category === filters.category)
    }

    // Stock status filter
    if (filters.stock !== "all") {
      result = result.filter((p) => {
        switch (filters.stock) {
          case "in_stock":
            return p.currentQuantity > 0
          case "low_stock":
            return (
              p.currentQuantity > 0 && p.currentQuantity <= p.lowStockThreshold
            )
          case "out_of_stock":
            return p.currentQuantity === 0
          default:
            return true
        }
      })
    }

    return result
  }, [products, search, filters])

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
    filtered,
    hasActiveFilters,
    clearFilters,
  }
}
