// Filter options for supplier status.
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const

// Column definitions for the supplier table.
export const SUPPLIER_TABLE_COLUMNS = [
  { id: "contactPerson", label: "Contact Person", type: "text" },
  { id: "contactNumber", label: "Contact Number", type: "mono" },
  { id: "address", label: "Address", type: "text" },
  { id: "archivedAt", label: "Status", type: "badge" },
] as const

export type SupplierColumnId = (typeof SUPPLIER_TABLE_COLUMNS)[number]["id"]
