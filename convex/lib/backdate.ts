import { BACKDATE_GRACE_MS, BACKDATE_WINDOW_MS } from "./constants"

/**
 * Resolves an optional business-time (`createdAt`) override into the event
 * timestamp and whether the caller actually backdated.
 *
 * Policy (see situations in the defense notes):
 * - No override → event time is now, not backdated.
 * - Override by a non-owner → rejected, even where the action itself is
 *   staff-allowed (dispatch submit). An operator who can move events in time
 *   can make the books balance around missing goods.
 * - Future beyond a small clock-skew grace → rejected.
 * - Past beyond the window → rejected. The window covers "yesterday's
 *   delivery recorded today", not history rewrites; go-live imports use the
 *   seed script, not the UI.
 *
 * Same-day earlier times still count as backdated: happened ≠ recorded, and
 * the audit trail must mark the discrepancy even within one day.
 */
export function resolveBusinessTime(args: {
  createdAt: number | undefined
  isOwner: boolean
  nowMs?: number
}): { eventMs: number; wasBackdated: boolean } {
  const nowMs = args.nowMs ?? Date.now()
  if (args.createdAt === undefined) {
    return { eventMs: nowMs, wasBackdated: false }
  }
  if (!args.isOwner) {
    throw new Error("Only owners can backdate a transaction")
  }
  if (args.createdAt > nowMs + BACKDATE_GRACE_MS) {
    throw new Error("Transaction date cannot be in the future")
  }
  if (args.createdAt < nowMs - BACKDATE_WINDOW_MS) {
    throw new Error("Transaction date cannot be more than 30 days in the past")
  }
  return { eventMs: args.createdAt, wasBackdated: true }
}
