/** Human-readable labels mapped to audit log field keys. */
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

/** Fields displayed in the audit log detail panel. */
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

/** Static action filter options (dynamic options come from the Convex query). */
export const ACTION_OPTIONS = [{ value: "all", label: "All Actions" }]

/** Quick-select date preset options for the audit log filter. */
export const DATE_PRESETS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
] as const

/** Number of audit log entries per page. */
export const ITEMS_PER_PAGE = 30
