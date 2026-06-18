// Filter options for dispatch status.
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
] as const

// Column definitions for the dispatch-level table.
export const DISPATCH_TABLE_COLUMNS = [
  { id: "status", label: "Status" },
  { id: "userName", label: "Dispatched By" },
  { id: "itemCount", label: "Total Items" },
  { id: "createdAt", label: "Dispatched At" },
] as const

export type DispatchColumnId = (typeof DISPATCH_TABLE_COLUMNS)[number]["id"]

// Column definitions for the dispatch-items sub-table.
export const ITEMS_TABLE_COLUMNS = [
  { id: "batchCode", label: "Batch Code" },
  { id: "productSku", label: "SKU Code" },
  { id: "dispatchQuantity", label: "Qty" },
  { id: "quantityDeducted", label: "Qty Deducted" },
  { id: "unitCost", label: "Unit Cost" },
  { id: "lineTotal", label: "Line Total" },
] as const

export type ItemsColumnId = (typeof ITEMS_TABLE_COLUMNS)[number]["id"]
