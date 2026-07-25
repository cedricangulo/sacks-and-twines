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

// ─── Default Conversion Factor (bundle/roll to base unit) ───────────────────
// Twines have no known meters-per-roll value — staff did not track this.
export const DEFAULT_CONVERSION_FACTOR = {
  sacks: SACKS_DEFAULT_PACK_SIZE,
  twines: undefined,
  thread: undefined,
} as const

// ─── Seed Config ────────────────────────────────────────────────────────────
export const SUPPLIER_COUNT = 3
export const SEED_DATE_START = "2025-05-01"
export const SEED_DATE_END = "2026-05-10"
