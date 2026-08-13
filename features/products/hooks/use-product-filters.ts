"use client"

import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"
import type { DispatchReadyProduct } from "@/features/products/validation"

const DEFAULT_STOCK = "in_stock"

// URL query-state parsers for product catalog filters.
const categoryParsers = {
  category: parseAsStringEnum(["all", "sacks", "twines"] as const).withDefault(
    "all"
  ),
  stock: parseAsStringEnum([
    "all",
    "in_stock",
    "low_stock",
    "out_of_stock",
  ] as const).withDefault(DEFAULT_STOCK),
  sort: parseAsStringEnum([
    "name_asc",
    "name_desc",
    "stock_desc",
    "stock_asc",
  ] as const).withDefault("name_asc"),
}

// Search, category, stock-status, and sort state synced to URL query params with client-side filtering.
export function useProductFilters(
  products: DispatchReadyProduct[] | undefined
) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [filters, setFilters] = useQueryStates(categoryParsers, {
    history: "replace",
  })

  const hasActiveFilters =
    search !== "" ||
    filters.category !== "all" ||
    filters.stock !== DEFAULT_STOCK ||
    filters.sort !== "name_asc"

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
          p.keywords?.some((k) => k.toLowerCase().includes(q)) === true
      )
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
            return (
              p.currentQuantity > 0 && p.currentQuantity > p.lowStockThreshold
            )
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

    // Sort
    result = result.toSorted((a, b) => {
      switch (filters.sort) {
        case "name_asc":
          return a.name.localeCompare(b.name)
        case "name_desc":
          return b.name.localeCompare(a.name)
        case "stock_desc":
          return b.currentQuantity - a.currentQuantity
        case "stock_asc":
          return a.currentQuantity - b.currentQuantity
        default:
          return 0
      }
    })

    return result
  }, [products, search, filters])

  const clearFilters = () => {
    setSearch("")
    setFilters({ category: "all", stock: DEFAULT_STOCK, sort: "name_asc" })
  }

  return {
    search,
    setSearch,
    category: filters.category,
    stock: filters.stock,
    sort: filters.sort,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  }
}
