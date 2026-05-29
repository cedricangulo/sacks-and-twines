import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Returns dispatch and adjustment timestamps within a date range.
 * Uses the built-in `by_creation_time` index so only relevant records
 * are scanned. The frontend buckets by day using its local timezone.
 */
export const calendarSummary = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const [dispatchTimestamps, adjustmentTimestamps] = await Promise.all([
      ctx.db
        .query("dispatches")
        .withIndex("by_creation_time", (q) =>
          q.gte("_creationTime", startMs).lte("_creationTime", endMs)
        )
        .collect()
        .then((rows) => rows.map((d) => d.createdAt ?? d._creationTime)),
      ctx.db
        .query("stockAdjustments")
        .withIndex("by_creation_time", (q) =>
          q.gte("_creationTime", startMs).lte("_creationTime", endMs)
        )
        .collect()
        .then((rows) => rows.map((a) => a.createdAt ?? a._creationTime)),
    ])

    return { dispatchTimestamps, adjustmentTimestamps }
  },
})
