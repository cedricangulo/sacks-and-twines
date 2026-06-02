import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Returns dispatch and adjustment timestamps within a date range.
 * Queries both `by_creation_time` (production records) and
 * `by_createdAt` (seed/manual records) indexes and merges results.
 * The frontend buckets by day using its local timezone.
 */
export const calendarSummary = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const [byCreationTime, byCreatedAt] = await Promise.all([
      Promise.all([
        ctx.db
          .query("dispatches")
          .withIndex("by_creation_time", (q) =>
            q.gte("_creationTime", startMs).lte("_creationTime", endMs)
          )
          .collect()
          .then((rows) =>
            rows
              .filter((d) => d.createdAt === undefined)
              .map((d) => d._creationTime)
          ),
        ctx.db
          .query("stockAdjustments")
          .withIndex("by_creation_time", (q) =>
            q.gte("_creationTime", startMs).lte("_creationTime", endMs)
          )
          .collect()
          .then((rows) =>
            rows
              .filter((a) => a.createdAt === undefined)
              .map((a) => a._creationTime)
          ),
      ]),
      Promise.all([
        ctx.db
          .query("dispatches")
          .withIndex("by_createdAt", (q) =>
            q.gte("createdAt", startMs).lte("createdAt", endMs)
          )
          .collect()
          .then((rows) => rows.map((d) => d.createdAt ?? d._creationTime)),
        ctx.db
          .query("stockAdjustments")
          .withIndex("by_createdAt", (q) =>
            q.gte("createdAt", startMs).lte("createdAt", endMs)
          )
          .collect()
          .then((rows) => rows.map((a) => a.createdAt ?? a._creationTime)),
      ]),
    ])

    return {
      dispatchTimestamps: [
        ...new Set([...byCreationTime[0], ...byCreatedAt[0]]),
      ],
      adjustmentTimestamps: [
        ...new Set([...byCreationTime[1], ...byCreatedAt[1]]),
      ],
    }
  },
})

/**
 * Returns aggregate counts and totals for dispatches and adjustments
 * within a date range. Used by the monthly stats bar.
 */
export const monthlyAggregates = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

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
    const merged = [...byCreationTime, ...byCreatedAt].filter((d) => {
      if (seen.has(d._id)) return false
      seen.add(d._id)
      return true
    })

    let totalItems = 0
    let totalValue = 0

    await Promise.all(
      merged.map(async (dispatch) => {
        const items = await ctx.db
          .query("dispatchItems")
          .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
          .collect()

        totalItems += dispatch.itemCount ?? items.length
        totalValue += items.reduce(
          (sum, item) => sum + item.quantityDeducted * item.unitCost,
          0
        )
      })
    )

    const [byCreationTimeAdj, byCreatedAtAdj] = await Promise.all([
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

    const seenAdj = new Set<string>()
    const adjustmentCount = [...byCreationTimeAdj, ...byCreatedAtAdj].filter(
      (a) => {
        if (seenAdj.has(a._id)) return false
        seenAdj.add(a._id)
        return true
      }
    ).length

    return {
      dispatchCount: merged.length,
      adjustmentCount,
      totalItems,
      totalValue,
    }
  },
})
