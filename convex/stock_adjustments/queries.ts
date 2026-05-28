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

    const q = createdByUserId
      ? ctx.db
          .query("stockAdjustments")
          .withIndex("by_userId", (q) =>
            q
              .eq("userId", createdByUserId)
              .gte("_creationTime", startMs)
              .lte("_creationTime", endMs)
          )
          .order("desc")
      : ctx.db.query("stockAdjustments").order("desc")

    const allAdjustments = await q.take(500)
    const adjustments = createdByUserId
      ? allAdjustments
      : allAdjustments.filter(
          (a) => a._creationTime >= startMs && a._creationTime <= endMs
        )

    return await Promise.all(
      adjustments.map(async (adjustment) => {
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
