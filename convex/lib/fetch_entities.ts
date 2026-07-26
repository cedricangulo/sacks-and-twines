import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

/**
 * Fetch dispatches within a date range, deduplicating across both indexes.
 *
 * Convex's internal `_creationTime` (used by production records) and the
 * custom `createdAt` field (used by seed/manual records with specific dates)
 * are queried separately and merged. In production `createdAt` will be
 * removed, and all records will use `_creationTime` exclusively.
 */
export async function fetchDispatches(
  ctx: QueryCtx,
  startMs: number,
  endMs: number,
  status?: "completed" | "voided"
): Promise<Doc<"dispatches">[]> {
  const [byCreationTime, byCreatedAt] = await Promise.all([
    ctx.db
      .query("dispatches")
      .withIndex("by_creation_time", (q) =>
        q.gte("_creationTime", startMs).lte("_creationTime", endMs)
      )
      .collect()
      .then((rows) => rows.filter((d) => d.createdAt === undefined)),
    ctx.db
      .query("dispatches")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", startMs).lte("createdAt", endMs)
      )
      .collect(),
  ])

  const seen = new Set<string>()
  let result = [...byCreationTime, ...byCreatedAt].filter((d) => {
    if (seen.has(d._id)) return false
    seen.add(d._id)
    return true
  })

  if (status) {
    result = result.filter((d) => d.status === status)
  }

  return result
}

/**
 * Fetch stock adjustments within a date range, deduplicating across both
 * indexes. Same dual-index rationale as `fetchDispatches`.
 */
export async function fetchAdjustments(
  ctx: QueryCtx,
  startMs: number,
  endMs: number
): Promise<Doc<"stockAdjustments">[]> {
  const [byCreationTime, byCreatedAt] = await Promise.all([
    ctx.db
      .query("stockAdjustments")
      .withIndex("by_creation_time", (q) =>
        q.gte("_creationTime", startMs).lte("_creationTime", endMs)
      )
      .collect()
      .then((rows) => rows.filter((a) => a.createdAt === undefined)),
    ctx.db
      .query("stockAdjustments")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", startMs).lte("createdAt", endMs)
      )
      .collect(),
  ])

  const seen = new Set<string>()
  return [...byCreationTime, ...byCreatedAt].filter((a) => {
    if (seen.has(a._id)) return false
    seen.add(a._id)
    return true
  })
}
