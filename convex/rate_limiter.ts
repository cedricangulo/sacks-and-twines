/**
 * ─── RATE LIMIT CONFIG ───────────────────────────────────────
 * All values are intentionally loose to avoid disruption.
 * Tighten after observing real usage in production.
 *
 * Guidelines for tuning:
 *   rate      = sustained operations per period (long-term ceiling)
 *   capacity  = burst allowance (short-term spike room)
 *   key       = "userId" for per-user, omit for global
 *
 * Algorithm: token bucket for all — allows bursts, enforces average.
 * ──────────────────────────────────────────────────────────────
 */

/**
 * Rate limiter configuration using token-bucket algorithm.
 * All values are intentionally loose — tighten after observing real usage.
 *
 * Per-user limits (key = userId) apply to individual operators.
 * Global limits (no key) apply cluster-wide as safety valves.
 */
import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { components } from "./_generated/api"

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // ── Users ───────────────────────────────────────────────────
  // Staff account creation per user
  createUser: { kind: "token bucket", period: MINUTE, rate: 5, capacity: 10 },
  // Staff deactivation per user
  deactivateUser: {
    kind: "token bucket",
    period: MINUTE,
    rate: 20,
    capacity: 40,
  },

  // ── Suppliers ───────────────────────────────────────────────
  // Supplier creation per user
  createSupplier: {
    kind: "token bucket",
    period: MINUTE,
    rate: 20,
    capacity: 40,
  },
  // Supplier update per user
  updateSupplier: {
    kind: "token bucket",
    period: MINUTE,
    rate: 30,
    capacity: 60,
  },
  // Supplier archive per user
  archiveSupplier: {
    kind: "token bucket",
    period: MINUTE,
    rate: 15,
    capacity: 30,
  },
  // Product archive per user
  archiveProduct: {
    kind: "token bucket",
    period: MINUTE,
    rate: 15,
    capacity: 30,
  },

  // ── Global safety valves (no key = global singleton) ────────
  // Total staff creations across all users
  globalCreateUser: {
    kind: "token bucket",
    period: MINUTE,
    rate: 10,
    capacity: 20,
  },
  // Total supplier creations across all users
  globalCreateSupplier: {
    kind: "token bucket",
    period: MINUTE,
    rate: 50,
    capacity: 100,
  },
  // Catch-all write throttle across all mutations
  globalMutations: {
    kind: "token bucket",
    period: MINUTE,
    rate: 120,
    capacity: 240,
  },

  // ── Batches ────────────────────────────────────────────────
  // Stock-in / batch creation per user
  createBatch: { kind: "token bucket", period: MINUTE, rate: 30, capacity: 60 },
  // Batch update per user
  updateBatch: { kind: "token bucket", period: MINUTE, rate: 30, capacity: 60 },
  // Batch void per user
  voidBatch: { kind: "token bucket", period: MINUTE, rate: 15, capacity: 30 },
  // File upload URL generation per user
  generateUploadUrl: {
    kind: "token bucket",
    period: MINUTE,
    rate: 20,
    capacity: 40,
  },

  // ── Auth ────────────────────────────────────────────────────
  // Failed sign-in attempts per email address
  signInFailed: {
    kind: "token bucket",
    period: HOUR,
    rate: 10,
    capacity: 10,
  },
  // Auth attempt audit logging per email address
  logAttempt: {
    kind: "token bucket",
    period: MINUTE,
    rate: 20,
    capacity: 30,
  },

  // ── Future: Dispatches ──────────────────────────────────────
  // Placeholder — adjust when dispatch CRUD ships
  createDispatch: {
    kind: "token bucket",
    period: MINUTE,
    rate: 20,
    capacity: 40,
  },
  // Placeholder
  voidDispatch: {
    kind: "token bucket",
    period: MINUTE,
    rate: 10,
    capacity: 20,
  },

  // ── Future: Stock Adjustments ───────────────────────────────
  // Placeholder — adjust when stock adjustment CRUD ships
  createStockAdjustment: {
    kind: "token bucket",
    period: MINUTE,
    rate: 30,
    capacity: 60,
  },
})

type RateLimitName = keyof NonNullable<typeof rateLimiter.limits>

/**
 * Per-user rate limit check. Call AFTER auth check in mutations.
 * Throws on violation — operation is blocked, client sees retry-after toast.
 * @param ctx - Rate limiter context (mutation ctx).
 * @param name - Name of the rate limit to check.
 * @param userId - ID of the user to check the limit for.
 */
export async function perUserLimit(
  ctx: Parameters<typeof rateLimiter.limit>[0],
  name: RateLimitName,
  userId: string
) {
  await rateLimiter.limit(ctx, name, { key: userId, throws: true })
}

/**
 * Global rate limit check. Call alongside perUserLimit.
 * Throws on violation.
 * @param ctx - Rate limiter context (mutation ctx).
 * @param name - Name of the rate limit to check.
 */
export async function globalLimit(
  ctx: Parameters<typeof rateLimiter.limit>[0],
  name: RateLimitName
) {
  await rateLimiter.limit(ctx, name, { throws: true })
}
