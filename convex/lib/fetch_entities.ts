import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

/**
 * Fetch dispatches within a date range.
 *
 * Reads a single `by_createdAt` index range. `createdAt` is written by the
 * production `submit` mutation, by the seed data, and is backfilled by
 * `backfillDispatchCreatedAt` for any older records, so every dispatch is
 * addressable through this index.
 */
export async function fetchDispatches(
  ctx: QueryCtx,
  startMs: number,
  endMs: number,
  status?: "completed" | "voided"
): Promise<Doc<"dispatches">[]> {
  if (status) {
    return ctx.db
      .query("dispatches")
      .withIndex("by_status_createdAt", (q) =>
        q.eq("status", status).gte("createdAt", startMs).lte("createdAt", endMs)
      )
      .collect()
  }
  return ctx.db
    .query("dispatches")
    .withIndex("by_createdAt", (q) =>
      q.gte("createdAt", startMs).lte("createdAt", endMs)
    )
    .collect()
}

/**
 * Fetch dispatches within a date range, newest first, optionally capped.
 * Used by list views that want the most recent N dispatches in a range.
 */
export async function fetchDispatchesOrdered(
  ctx: QueryCtx,
  startMs: number,
  endMs: number,
  limit?: number
): Promise<Doc<"dispatches">[]> {
  const q = ctx.db
    .query("dispatches")
    .withIndex("by_createdAt", (q) =>
      q.gte("createdAt", startMs).lte("createdAt", endMs)
    )
    .order("desc")
  return limit !== undefined ? q.take(limit) : q.collect()
}

/**
 * Fetch stock adjustments within a date range via the `by_createdAt` index.
 */
export async function fetchAdjustments(
  ctx: QueryCtx,
  startMs: number,
  endMs: number
): Promise<Doc<"stockAdjustments">[]> {
  return ctx.db
    .query("stockAdjustments")
    .withIndex("by_createdAt", (q) =>
      q.gte("createdAt", startMs).lte("createdAt", endMs)
    )
    .collect()
}
