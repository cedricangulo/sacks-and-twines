// ─── Assumptions (pending owner confirmation) ───────────────────────────────
export const SACKS_PACK_SIZE = 50
export const TWINES_CUTS_PER_ROLL = 50
export const THREAD_SRP = { large: 200, medium: 100, small: 65 } as const
export const THREAD_PROCUREMENT_COST = {
  large: 180,
  medium: 90,
  small: 58.5,
} as const
export const RETURNS_DAMAGE_THRESHOLD = 10

// ─── Product Enums ──────────────────────────────────────────────────────────
export const PRODUCT_CATEGORIES = ["sacks", "twines", "thread"] as const
export const BASE_UOMS = ["piece", "roll", "cut"] as const
export const DISPATCH_UOMS = ["piece", "roll", "cut"] as const
export const INTEGER_UOMS = ["piece", "roll"] as const

// ─── Business Rules ─────────────────────────────────────────────────────────
export const ROLES = ["owner", "staff"] as const
export const STATUSES = ["active", "archived", "depleted", "voided"] as const

// ─── Derived Defaults ───────────────────────────────────────────────────────
export const DEFAULT_CONVERSION_FACTOR = {
  sacks: SACKS_PACK_SIZE,
  twines: TWINES_CUTS_PER_ROLL,
  thread: undefined,
} as const

// ─── Seed Config ────────────────────────────────────────────────────────────
export const SUPPLIER_COUNT = 8
export const SEED_DATE_START = "2025-05-01"
export const SEED_DATE_END = "2026-05-10"
