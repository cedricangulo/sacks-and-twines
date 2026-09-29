import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

/**
 * Hard ceiling applied when a caller passes an effectively unbounded range —
 * notably the reports "All Time" preset, which resolves to
 * `{ startMs: 0, endMs: Infinity }`.
 *
 * Without a cap, that preset makes every caller read the entire table, which is
 * how the reports page approaches the 32,000-documents-scanned limit. Callers
 * that legitimately need everything should paginate instead.
 * See docs/PERFORMANCE-AUDIT.md P11.
 *
 * Set to 1,000 rather than a larger ceiling on a bandwidth argument: Convex
 * treats loading 1,000+ documents in one query as potentially unbounded and
 * advises keeping routine reactive scans well under a few hundred. At ~1 KB per
 * document this bounds a single capped read to roughly 1 MB, against a free-tier
 * budget of ~33 MB/day. The previous 5,000 allowed ~5 MB per load, so six or
 * seven uncached dashboard loads could exhaust a day's allocation.
 *
 * Capping is not a substitute for paginating — a truncated read still returns
 * the wrong numbers. Callers must surface `truncated` (see `CappedRead`), and
 * ranges wide enough to hit this ceiling should aggregate from pre-computed
 * rollups instead of scanning dispatches. See docs/PERFORMANCE-AUDIT.md P11.
 */
export const UNBOUNDED_RANGE_LIMIT = 1_000

/** Result of a capped read. `truncated` is `true` when rows were dropped. */
export interface CappedRead<T> {
  docs: T[]
  truncated: boolean
}

/**
 * Applies `limit` to a read while making the cut detectable.
 *
 * Over-fetches by one so `truncated` can be reported instead of the caller
 * inferring it from `docs.length`. A silently shortened export is worse than a
 * visibly incomplete one: the row count reaches the CSV footer, the PDF summary
 * and (for audit logs) the audit record of the export itself, so a false count
 * propagates. Mirrors `auditLogs.queries.exportCsv`.
 */
export async function capRead<T>(
  read: (limit: number) => Promise<T[]>,
  limit: number
): Promise<CappedRead<T>> {
  const overFetched = await read(limit + 1)
  return overFetched.length > limit
    ? { docs: overFetched.slice(0, limit), truncated: true }
    : { docs: overFetched, truncated: false }
}

/**
 * Fetch dispatches within a date range.
 *
 * Reads a single `by_createdAt` index range. `createdAt` is written by the
 * production `submit` mutation, by the seed data, and is backfilled by
 * `backfillDispatchCreatedAt` for any older records, so every dispatch is
 * addressable through this index.
 *
 * `order` defaults to `"asc"` because most callers aggregate (bucketing by day
 * or summing per product), where row order cannot affect the result. Callers
 * that present rows to a reader — detail panels, CSV exports — must pass
 * `"desc"`, because a capped read keeps whichever end of the range it reads
 * first: with the default, a range wide enough to hit the ceiling silently
 * returns the *oldest* dispatches and drops the newest.
 *
 * `.order("desc")` is not more expensive than ascending. It traverses the same
 * index range in reverse, so the scan stops after the same `limit` documents.
 */
export async function fetchDispatches(
  ctx: QueryCtx,
  startMs: number,
  endMs: number,
  status?: "completed" | "voided",
  limit: number = UNBOUNDED_RANGE_LIMIT,
  order: "asc" | "desc" = "asc"
): Promise<CappedRead<Doc<"dispatches">>> {
  if (status) {
    return capRead(
      (n) =>
        ctx.db
          .query("dispatches")
          .withIndex("by_status_createdAt", (q) =>
            q
              .eq("status", status)
              .gte("createdAt", startMs)
              .lte("createdAt", endMs)
          )
          .order(order)
          .take(n),
      limit
    )
  }
  return capRead(
    (n) =>
      ctx.db
        .query("dispatches")
        .withIndex("by_createdAt", (q) =>
          q.gte("createdAt", startMs).lte("createdAt", endMs)
        )
        .order(order)
        .take(n),
    limit
  )
}

/**
 * Fetch dispatches within a date range, newest first, optionally capped.
 *
 * Equivalent to `fetchDispatches(ctx, startMs, endMs, undefined, limit, "desc")`.
 * Kept as a separate export because the shape differs (no `status`, optional
 * `limit`), which is easier to read at the call site than six positional args.
 */
export async function fetchDispatchesOrdered(
  ctx: QueryCtx,
  startMs: number,
  endMs: number,
  limit?: number
): Promise<CappedRead<Doc<"dispatches">>> {
  const q = ctx.db
    .query("dispatches")
    .withIndex("by_createdAt", (q) =>
      q.gte("createdAt", startMs).lte("createdAt", endMs)
    )
    .order("desc")
  return capRead((n) => q.take(n), limit ?? UNBOUNDED_RANGE_LIMIT)
}

/**
 * Fetch stock adjustments within a date range via the `by_createdAt` index.
 */
export async function fetchAdjustments(
  ctx: QueryCtx,
  startMs: number,
  endMs: number,
  limit?: number
): Promise<CappedRead<Doc<"stockAdjustments">>> {
  return capRead(
    (n) =>
      ctx.db
        .query("stockAdjustments")
        .withIndex("by_createdAt", (q) =>
          q.gte("createdAt", startMs).lte("createdAt", endMs)
        )
        .take(n),
    limit ?? UNBOUNDED_RANGE_LIMIT
  )
}
