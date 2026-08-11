// Filter options for product status.
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const

// Filter options for product category.
export const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sacks", label: "Sacks" },
  { value: "twines", label: "Twines" },
  { value: "thread", label: "Thread" },
] as const

// Filter options for stock health status.
export const STOCK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
] as const

// Column definitions for the inventory (product-level) table.
export const INVENTORY_TABLE_COLUMNS = [
  { id: "skuCode", label: "SKU", type: "mono" },
  { id: "category", label: "Category", type: "badge" },
  { id: "baseUom", label: "Unit", type: "text" },
  { id: "currentQuantity", label: "Stock", type: "number" },
  { id: "totalAssetValue", label: "Asset Value", type: "currency" },
  { id: "createdAt", label: "Created", type: "date" },
  { id: "status", label: "Status", type: "badge" },
] as const

export type InventoryColumnId = (typeof INVENTORY_TABLE_COLUMNS)[number]["id"]

// Column definitions for the batch-level sub-table.
export const BATCH_TABLE_COLUMNS = [
  { id: "quantityReceived", label: "Qty Received" },
  { id: "quantityRemaining", label: "Qty Remaining" },
  { id: "unitCost", label: "Unit Cost" },
  { id: "totalProcurementCost", label: "Total Cost" },
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created" },
] as const

export type BatchColumnId = (typeof BATCH_TABLE_COLUMNS)[number]["id"]
