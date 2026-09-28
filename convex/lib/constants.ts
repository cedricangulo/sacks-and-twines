// ─── Assumptions (pending owner confirmation) ───────────────────────────────
export const SACKS_DEFAULT_PACK_SIZE = 50
export const RETURNS_DAMAGE_THRESHOLD = 10

// ─── Product Enums (confirmed) ──────────────────────────────────────────────
export const PRODUCT_CATEGORIES = ["sacks", "twines", "thread"] as const
export const BASE_UOMS = ["piece", "roll", "meter"] as const
export const DISPATCH_UOMS = ["piece", "roll", "meter"] as const
export const INTEGER_UOMS = ["piece", "roll"] as const

export const DISPATCH_UOM_BY_CATEGORY: Record<
  (typeof PRODUCT_CATEGORIES)[number],
  readonly string[]
> = {
  sacks: ["piece"],
  twines: ["meter", "roll"],
  thread: ["roll"],
} as const

// ─── Business Rules (confirmed) ─────────────────────────────────────────────
export const ROLES = ["owner", "staff"] as const
export const STATUSES = ["active", "archived", "depleted", "voided"] as const

// ─── Audit Log Actions ──────────────────────────────────────────────────────
// Canonical set of every `action` string the audit log can contain. Kept here so
// the audit-log filter dropdown does not have to scan the table to discover it —
// a DB-derived list silently drops action types that stop appearing in recent
// traffic, making historical rows unreachable through the UI.
//
// Source of truth: the `action:` argument at each
// `ctx.runMutation(internal.auditLogs.mutations.log, …)` callsite, plus
// `ALLOWED_ACTIONS` in convex/auth/logAttempt.ts. `stock_out` is seed-only and is
// retained so existing deployments keep filtering it.
//
// NOTE: sorted alphabetically — `listActions` used to return a sorted array, so
// the dropdown order is unchanged.
export const AUDIT_LOG_ACTIONS = [
  "audit_log_export",
  "auth_sign_in",
  "auth_sign_in_failed",
  "batch_update",
  "batch_void",
  "dispatch_submit",
  "product_archive",
  "product_create",
  "product_unarchive",
  "product_update",
  "stock_adjustment",
  "stock_in",
  "stock_out",
  "supplier_archive",
  "supplier_create",
  "supplier_unarchive",
  "supplier_update",
  "user_activate",
  "user_create",
  "user_deactivate",
] as const

export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[number]

// ─── Default Conversion Factor (bundle/roll to base unit) ───────────────────
// Twines have no known meters-per-roll value — staff did not track this.
export const DEFAULT_CONVERSION_FACTOR = {
  sacks: SACKS_DEFAULT_PACK_SIZE,
  twines: undefined,
  thread: undefined,
} as const

// ─── Seed Config ────────────────────────────────────────────────────────────
export const SUPPLIER_COUNT = 3
export const SEED_DATE_START = "2026-06-01"
export const SEED_DATE_END = "2026-10-05"

// ─── Dense dispatch seed (every calendar day ≥ 20 dispatches) ──────────────
export const DENSE_DAYS = 90
export const DAILY_DISPATCH_MIN = 20
export const DAILY_DISPATCH_MAX = 25
export const DISPATCH_CHUNK_DAYS = 10
export const NUM_BASELINE_DISPATCHES = 150
export const CLEAR_CHUNK_LIMIT = 2000
