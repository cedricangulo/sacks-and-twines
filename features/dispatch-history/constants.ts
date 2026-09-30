import type { SkeletonColumn } from "@/components/ui/skeleton-table"

// Filter options for dispatch status.
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
] as const

// Column definitions for the dispatch-level table.
//
// The `type` field drives the Columns dropdown and the loading skeleton, and
// `SkeletonCell` renders `number`/`currency` right-aligned — so a numeric column
// left as `"mono"` shows a left-aligned skeleton against a right-aligned value.
// `totalItems`/`totalQuantity`/`orNumber` are intentionally absent: they are not
// toggleable (see the column defs) and `orNumber` is an identifier, not a
// measure, so it stays left-aligned throughout.
export const DISPATCH_TABLE_COLUMNS = [
  { id: "status", label: "Status", type: "badge" },
  { id: "userName", label: "Dispatched By", type: "text" },
  { id: "itemCount", label: "Total Items", type: "number" },
  { id: "createdAt", label: "Dispatched At", type: "date" },
] as const

export type DispatchColumnId = (typeof DISPATCH_TABLE_COLUMNS)[number]["id"]

// Column definitions for the dispatch-items sub-table.
export const ITEMS_TABLE_COLUMNS = [
  { id: "batchCode", label: "Batch Code", type: "mono" },
  { id: "productSku", label: "SKU Code", type: "mono" },
  { id: "dispatchQuantity", label: "Qty", type: "number" },
  { id: "quantityDeducted", label: "Qty Deducted", type: "number" },
  { id: "unitCost", label: "Unit Cost", type: "currency" },
  { id: "lineTotal", label: "Line Total", type: "currency" },
] as const

export type ItemsColumnId = (typeof ITEMS_TABLE_COLUMNS)[number]["id"]

// Loading skeleton for the dispatch table, in the same order the container
// renders (`dispatch-table-container.tsx`). This cannot be spread from
// `DISPATCH_TABLE_COLUMNS`, which is ordered for the Columns dropdown and holds
// only the toggleable subset — spreading it produced a skeleton whose Status and
// Dispatched By cells were swapped against the loaded table.
// `SkeletonTable` takes a mutable array, hence the non-`as const` type.
export const DISPATCH_SKELETON_COLUMNS: SkeletonColumn[] = [
  { label: "", type: "text" },
  { label: "OR Number", type: "mono" },
  { label: "Customer Ref", type: "text" },
  { label: "Dispatched By", type: "text" },
  { label: "Status", type: "badge" },
  { label: "Total Items", type: "number" },
  { label: "Total Qty", type: "number" },
  { label: "Dispatched At", type: "date" },
]
