// Filter options for batch (stock-in) status.
export const RECEIVING_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "depleted", label: "Depleted" },
  { value: "voided", label: "Voided" },
] as const

export type ReceivingStatus = (typeof RECEIVING_STATUS_OPTIONS)[number]["value"]

// Quick date ranges for the receiving history query. Deliberately excludes
// "All Time" — an unbounded range over `batches` is a full index scan, and the
// seed already produces a lot of history. See docs/PERFORMANCE-AUDIT.md P11.
export const RECEIVING_DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-90-days", label: "Last 90 Days" },
] as const

export type ReceivingDateRange = (typeof RECEIVING_DATE_RANGES)[number]["value"]

export const DEFAULT_DATE_RANGE: ReceivingDateRange = "last-90-days"

export const RECEIVING_ITEMS_PER_PAGE = 30

// Toggleable column definitions. `batchCode` is `enableHiding: false` on the
// column def and so is intentionally absent here, matching the dispatch-history
// convention.
//
// This is deliberately short. SKU, supplier, quantity remaining, unit cost and
// receiver live in the row actions dialog instead
// (`components/dialogs/receiving-batch-details-dialog.tsx`), which keeps the
// table narrow enough to fit without a horizontal scrollbar.
//
// `supplierId` is still a filter even though the column is gone — the filter bar
// and this list are independent. `receivedBy` is not a filter at all: stock-in
// is owner-only and no mutation can create a second owner, so it could only ever
// select everything. It survives only as a display field in the dialog.
//
// The `type` values drive both the Columns dropdown and the loading skeleton,
// so they must stay in sync with the cell renderers in
// `components/table/receiving-table-container.tsx` — a numeric column left as
// `"text"` shows a left-aligned skeleton against a right-aligned value.
export const RECEIVING_TABLE_COLUMNS = [
  { id: "productName", label: "Product", type: "name" },
  { id: "quantityReceived", label: "Qty Received", type: "number" },
  { id: "totalProcurementCost", label: "Total Cost", type: "currency" },
  { id: "createdAt", label: "Received At", type: "date" },
  { id: "status", label: "Status", type: "badge" },
] as const

export type ReceivingColumnId = (typeof RECEIVING_TABLE_COLUMNS)[number]["id"]
