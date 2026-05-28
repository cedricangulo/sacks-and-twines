import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Lists dispatches within a date range, optionally filtered by creator.
 * Enriches each dispatch with the user's display name and item count.
 * Uses `by_userId` index when filtering by user; default ordering otherwise.
 */
export const list = query({
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
          .query("dispatches")
          .withIndex("by_userId", (q) =>
            q
              .eq("userId", createdByUserId)
              .gte("_creationTime", startMs)
              .lte("_creationTime", endMs)
          )
          .order("desc")
      : ctx.db.query("dispatches").order("desc")

    const allDispatches = await q.take(500)
    const dispatches = createdByUserId
      ? allDispatches
      : allDispatches.filter(
          (d) => d._creationTime >= startMs && d._creationTime <= endMs
        )

    return await Promise.all(
      dispatches.map(async (dispatch) => {
        if (
          dispatch.userName !== undefined &&
          dispatch.itemCount !== undefined
        ) {
          return {
            ...dispatch,
            userName: dispatch.userName,
            itemCount: dispatch.itemCount,
          }
        }
        const [user, items] = await Promise.all([
          ctx.db.get(dispatch.userId),
          ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
            .collect(),
        ])
        return {
          ...dispatch,
          userName: user?.name ?? "Unknown",
          itemCount: items.length,
        }
      })
    )
  },
})

/**
 * Fetches all line items for a specific dispatch, enriched with
 * product name, SKU, batch code, and line total.
 */
export const getItemsByDispatch = query({
  args: { dispatchId: v.id("dispatches") },
  handler: async (ctx, { dispatchId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const items = await ctx.db
      .query("dispatchItems")
      .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatchId))
      .collect()

    return Promise.all(
      items.map(async (item) => {
        const [product, batch] = await Promise.all([
          ctx.db.get(item.productId),
          ctx.db.get(item.batchId),
        ])
        return {
          ...item,
          productName: product?.name ?? "Unknown",
          productSku: product?.skuCode ?? "",
          batchCode: batch?.batchCode ?? "",
          lineTotal: item.quantityDeducted * item.unitCost,
        }
      })
    )
  },
})
