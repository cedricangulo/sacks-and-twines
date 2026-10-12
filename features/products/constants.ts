// Product catalog constants.
//
// `CATEGORY_OPTIONS` and `STOCK_OPTIONS` are re-exported from the inventory
// feature rather than declared here. The two dropdowns previously had identical
// copies of both lists, which is how they drifted apart from the nuqs parsers —
// the options offered "thread" while the parser rejected it. One definition,
// imported by both filter bars, removes that class of bug.
//
// `SORT_OPTIONS` is catalog-only and stays here.
import type { ProductUom } from "@/features/inventory/constants"

export {
  CATEGORY_OPTIONS,
  STOCK_OPTIONS,
} from "@/features/inventory/constants"

// Sort options for the product catalog.
export const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "stock_desc", label: "Stock High-Low" },
  { value: "stock_asc", label: "Stock Low-High" },
] as const

export type ProductSort = (typeof SORT_OPTIONS)[number]["value"]

// Re-exported so the catalog filter bar can type its props without reaching
// into the inventory feature's internals.
export type { ProductUom }
