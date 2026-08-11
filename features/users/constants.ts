// Filter options for staff user status.
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
] as const

// Column definitions for the staff table.
export const STAFF_TABLE_COLUMNS = [
  { id: "email", label: "Email", type: "text" },
  { id: "status", label: "Status", type: "badge" },
  { id: "created", label: "Created", type: "date" },
] as const

export type StaffColumnId = (typeof STAFF_TABLE_COLUMNS)[number]["id"]
