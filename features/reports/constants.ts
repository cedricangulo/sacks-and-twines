export type TimeRange = "month" | "year" | "all"

// Number of items per page in detail panel tables.
export const ITEMS_PER_PAGE = 20

// Month names for calendar display.
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

// Day names for calendar header.
export const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const

// Computes start/end timestamps for the stats bar based on range and selection state.
export function getStatsRange(
  range: TimeRange,
  filters: {
    year: number
    monthStartMs: number
    monthEndMs: number
    selectedDayStartMs: number | null
    selectedDayEndMs: number | null
  }
): { startMs: number; endMs: number } {
  if (
    filters.selectedDayStartMs !== null &&
    filters.selectedDayEndMs !== null
  ) {
    return {
      startMs: filters.selectedDayStartMs,
      endMs: filters.selectedDayEndMs,
    }
  }
  switch (range) {
    case "month":
      return { startMs: filters.monthStartMs, endMs: filters.monthEndMs }
    case "year":
      return {
        startMs: new Date(filters.year, 0, 1).getTime(),
        endMs: new Date(filters.year, 11, 31, 23, 59, 59, 999).getTime(),
      }
    case "all":
      return { startMs: 0, endMs: Infinity }
  }
}

// ---------------------------------------------------------------------------
// Export column definitions
// ---------------------------------------------------------------------------

export type ExportColumn = {
  id: string
  label: string
  section: string
  required: boolean
}

export const EXPORT_PRODUCT_COLUMNS: ExportColumn[] = [
  { id: "skuCode", label: "SKU Code", section: "Identity", required: true },
  { id: "name", label: "Name", section: "Identity", required: true },
  { id: "category", label: "Category", section: "Identity", required: false },
  { id: "baseUom", label: "Base UoM", section: "Identity", required: false },
  { id: "status", label: "Status", section: "Identity", required: false },
  {
    id: "currentQuantity",
    label: "Current Quantity",
    section: "Inventory",
    required: false,
  },
  {
    id: "totalAssetValue",
    label: "Total Asset Value",
    section: "Inventory",
    required: false,
  },
  {
    id: "lowStockThreshold",
    label: "Low Stock Threshold",
    section: "Inventory",
    required: false,
  },
  {
    id: "conversionFactor",
    label: "Conversion Factor",
    section: "Inventory",
    required: false,
  },
  {
    id: "lastSupplier",
    label: "Last Supplier",
    section: "Sourcing",
    required: false,
  },
  {
    id: "batchCount",
    label: "Batch Count",
    section: "Sourcing",
    required: false,
  },
]

export const EXPORT_BATCH_COLUMNS: ExportColumn[] = [
  { id: "batchCode", label: "Batch Code", section: "Identity", required: true },
  {
    id: "productName",
    label: "Product Name",
    section: "Identity",
    required: true,
  },
  { id: "category", label: "Category", section: "Identity", required: false },
  { id: "status", label: "Status", section: "Identity", required: false },
  { id: "unitCost", label: "Unit Cost", section: "Costs", required: false },
  { id: "totalCost", label: "Total Cost", section: "Costs", required: false },
  {
    id: "qtyReceived",
    label: "Qty Received",
    section: "Quantities",
    required: false,
  },
  {
    id: "qtyRemaining",
    label: "Qty Remaining",
    section: "Quantities",
    required: false,
  },
  { id: "supplier", label: "Supplier", section: "Sourcing", required: false },
  {
    id: "receivedBy",
    label: "Received By",
    section: "Sourcing",
    required: false,
  },
  {
    id: "createdAt",
    label: "Created At",
    section: "Sourcing",
    required: false,
  },
]

export const EXPORT_SUPPLIER_COLUMNS: ExportColumn[] = [
  {
    id: "companyName",
    label: "Company Name",
    section: "Identity",
    required: true,
  },
  { id: "status", label: "Status", section: "Identity", required: false },
  {
    id: "contactPerson",
    label: "Contact Person",
    section: "Contact",
    required: false,
  },
  {
    id: "contactNumber",
    label: "Contact Number",
    section: "Contact",
    required: false,
  },
  { id: "address", label: "Address", section: "Contact", required: false },
  {
    id: "batchCount",
    label: "Batch Count",
    section: "Sourcing",
    required: false,
  },
]

export const EXPORT_DISPATCH_COLUMNS: ExportColumn[] = [
  { id: "date", label: "Date", section: "Identity", required: true },
  { id: "status", label: "Status", section: "Identity", required: false },
  {
    id: "customerRef",
    label: "Customer Reference",
    section: "Details",
    required: false,
  },
  {
    id: "dispatchedBy",
    label: "Dispatched By",
    section: "Details",
    required: false,
  },
  {
    id: "orNumber",
    label: "OR Number",
    section: "Details",
    required: false,
  },
  {
    id: "itemCount",
    label: "Items Count",
    section: "Details",
    required: false,
  },
  {
    id: "totalValue",
    label: "Total Value",
    section: "Details",
    required: false,
  },
]

export const EXPORT_DISPATCH_ITEM_COLUMNS: ExportColumn[] = [
  { id: "date", label: "Date", section: "Identity", required: true },
  { id: "status", label: "Status", section: "Identity", required: false },
  {
    id: "customerRef",
    label: "Customer Reference",
    section: "Details",
    required: false,
  },
  {
    id: "dispatchedBy",
    label: "Dispatched By",
    section: "Details",
    required: false,
  },
  {
    id: "orNumber",
    label: "OR Number",
    section: "Details",
    required: false,
  },
  { id: "product", label: "Product", section: "Items", required: false },
  { id: "batchCode", label: "Batch Code", section: "Items", required: false },
  {
    id: "dispatchUom",
    label: "Dispatch UoM",
    section: "Items",
    required: false,
  },
  {
    id: "dispatchQty",
    label: "Dispatch Qty",
    section: "Quantities",
    required: false,
  },
  {
    id: "qtyDeducted",
    label: "Qty Deducted",
    section: "Quantities",
    required: false,
  },
  {
    id: "unitCost",
    label: "Unit Cost",
    section: "Quantities",
    required: false,
  },
  {
    id: "lineTotal",
    label: "Line Total",
    section: "Quantities",
    required: false,
  },
]

export const EXPORT_ADJUSTMENT_COLUMNS: ExportColumn[] = [
  { id: "date", label: "Date", section: "Identity", required: true },
  { id: "product", label: "Product", section: "Identity", required: true },
  { id: "status", label: "Status", section: "Identity", required: false },
  { id: "batchCode", label: "Batch Code", section: "Details", required: false },
  { id: "reason", label: "Reason", section: "Details", required: false },
  {
    id: "quantityAdjusted",
    label: "Quantity Adjusted",
    section: "Details",
    required: false,
  },
  {
    id: "adjustedBy",
    label: "Adjusted By",
    section: "Details",
    required: false,
  },
]

export const EXPORT_ENTITY_NAMES = {
  products: "Products",
  batches: "Batches",
  suppliers: "Suppliers",
  dispatches: "Dispatches",
  dispatchItems: "Dispatch Items",
  adjustments: "Stock Adjustments",
} as const

export type ExportEntity = keyof typeof EXPORT_ENTITY_NAMES

export const EXPORT_COLUMN_MAP: Record<ExportEntity, ExportColumn[]> = {
  products: EXPORT_PRODUCT_COLUMNS,
  batches: EXPORT_BATCH_COLUMNS,
  suppliers: EXPORT_SUPPLIER_COLUMNS,
  dispatches: EXPORT_DISPATCH_COLUMNS,
  dispatchItems: EXPORT_DISPATCH_ITEM_COLUMNS,
  adjustments: EXPORT_ADJUSTMENT_COLUMNS,
}

// ---------------------------------------------------------------------------
// Quick range presets for export date filters
// ---------------------------------------------------------------------------

export type QuickRange =
  | "today"
  | "this-week"
  | "this-month"
  | "last-month"
  | "last-90-days"
  | "all"

export const QUICK_RANGES: Array<{ label: string; preset: QuickRange }> = [
  { label: "Today", preset: "today" },
  { label: "This Week", preset: "this-week" },
  { label: "This Month", preset: "this-month" },
  { label: "Last Month", preset: "last-month" },
  { label: "Last 90 Days", preset: "last-90-days" },
  { label: "All Time", preset: "all" },
]

export function computeQuickRange(preset: QuickRange): {
  startMs: number
  endMs: number
} {
  const now = new Date()
  switch (preset) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { startMs: start.getTime(), endMs: start.getTime() + 86_399_999 }
    }
    case "this-week": {
      const day = now.getDay()
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - day
      )
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "last-month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      )
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "last-90-days": {
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      )
      const start = new Date(end)
      start.setDate(start.getDate() - 90)
      start.setHours(0, 0, 0, 0)
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "all": {
      return { startMs: 0, endMs: Infinity }
    }
  }
}
