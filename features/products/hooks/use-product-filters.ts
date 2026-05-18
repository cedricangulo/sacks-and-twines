"use client"

import { useMemo } from "react"
import { debounce, parseAsString, parseAsStringEnum, useQueryState, useQueryStates } from "nuqs"
import type { DispatchReadyProduct } from "@/features/products/validation"

const categoryParsers = {
  category: parseAsStringEnum(["all", "sacks", "twines"] as const).withDefault("all"),
  stock: parseAsStringEnum(["all", "in_stock", "low_stock", "out_of_stock"] as const).withDefault("all"),
  sort: parseAsStringEnum(["name_asc", "name_desc", "stock_desc", "stock_asc"] as const).withDefault("name_asc"),
}

export function useProductFilters(products: DispatchReadyProduct[] | undefined) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
      shallow: false,
      limitUrlUpdates: debounce(300),
    })
  )

  const [filters, setFilters] = useQueryStates(categoryParsers, {
    history: "replace",
    shallow: false,
  })

  const hasActiveFilters =
    search !== "" || filters.category !== "all" || filters.stock !== "all" || filters.sort !== "name_asc"

  const filtered = useMemo(() => {
    if (!products) return undefined

    let result = products

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.skuCode.toLowerCase().includes(q)
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
            return p.currentQuantity > p.lowStockThreshold
          case "low_stock":
            return (
              p.currentQuantity > 0 &&
              p.currentQuantity <= p.lowStockThreshold
            )
          case "out_of_stock":
            return p.currentQuantity === 0
          default:
            return true
        }
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
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
    setFilters({ category: "all", stock: "all", sort: "name_asc" })
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
