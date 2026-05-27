/** Category filter options for the product catalog. */
export const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sacks", label: "Sacks" },
  { value: "twines", label: "Twines" },
] as const

/** Stock-status filter options for the product catalog. */
export const STOCK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
] as const

/** Sort options for the product catalog. */
export const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "stock_desc", label: "Stock High-Low" },
  { value: "stock_asc", label: "Stock Low-High" },
] as const
