export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
] as const

export const STAFF_TABLE_COLUMNS = [
  { id: "email", label: "Email" },
  { id: "status", label: "Status" },
  { id: "created", label: "Created" },
] as const

export type StaffColumnId = (typeof STAFF_TABLE_COLUMNS)[number]["id"]
