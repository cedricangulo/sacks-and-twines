import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Lists stock adjustments within a date range, optionally filtered by creator.
 * Enriches each adjustment with product name, batch code, and user name.
 * Uses `by_userId` index when filtering by user; default ordering otherwise.
 */
export const listByDateRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    createdByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { startMs, endMs, createdByUserId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const adjustments = await ctx.db
      .query("stockAdjustments")
      .withIndex("by_creation_time", (q) =>
        q.gte("_creationTime", startMs).lte("_creationTime", endMs)
      )
      .order("desc")
      .collect()

    // Keep the userId index path only when filtering by user
    // (applied as an additional in-memory filter on the already-bounded set)
    const filtered = createdByUserId
      ? adjustments.filter((a) => a.userId === createdByUserId)
      : adjustments

    return await Promise.all(
      filtered.map(async (adjustment) => {
        const [product, batch, user] = await Promise.all([
          ctx.db.get(adjustment.productId),
          ctx.db.get(adjustment.batchId),
          ctx.db.get(adjustment.userId),
        ])
        return {
          ...adjustment,
          productName: product?.name ?? "Unknown",
          batchCode: batch?.batchCode ?? "Unknown",
          userName: user?.name ?? "Unknown",
        }
      })
    )
  },
})
