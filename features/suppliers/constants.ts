/** Filter options for supplier status. */
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const

/** Column definitions for the supplier table. */
export const SUPPLIER_TABLE_COLUMNS = [
  { id: "contactPerson", label: "Contact Person" },
  { id: "contactNumber", label: "Contact Number" },
  { id: "address", label: "Address" },
  { id: "archivedAt", label: "Status" },
] as const

export type SupplierColumnId = (typeof SUPPLIER_TABLE_COLUMNS)[number]["id"]
