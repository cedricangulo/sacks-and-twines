export const FIELD_LABELS: Record<string, string> = {
  timestamp: "timestamp",
  action: "action",
  userName: "actor",
  userId: "actor_id",
  userEmail: "actor_email",
  userRole: "actor_role",
  resourceType: "resource_type",
  resourceId: "resource_id",
  changes: "changes",
  details: "details",
  ipAddress: "ip_address",
  userAgent: "user_agent",
}

export const AUDIT_LOG_DETAIL_FIELDS = [
  "timestamp",
  "action",
  "userName",
  "userId",
  "userEmail",
  "userRole",
  "resourceType",
  "resourceId",
  "ipAddress",
  "userAgent",
] as const

export const ACTION_OPTIONS = [{ value: "all", label: "All Actions" }]

export const DATE_PRESETS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
] as const

export const ITEMS_PER_PAGE = 30
