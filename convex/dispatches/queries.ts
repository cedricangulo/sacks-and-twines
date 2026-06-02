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
    const dispatches = allDispatches.filter((d) => {
      const date = d.createdAt ?? d._creationTime
      return date >= startMs && date <= endMs
    })

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
 * Lists dispatches within a date range for the reports detail panel.
 * Enriches each dispatch with user name, item count, and total value.
 */
export const listByDateRange = query({
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
        .order("desc")
        .collect(),
      ctx.db
        .query("dispatches")
        .withIndex("by_createdAt", (q) =>
          q.gte("createdAt", startMs).lte("createdAt", endMs)
        )
        .order("desc")
        .collect(),
    ])

    // Production records from by_creation_time, seed records from by_createdAt
    const productionRecords = byCreationTime.filter(
      (d) => d.createdAt === undefined
    )

    // Merge and dedup by _id — production first preserves time order
    const seen = new Set<string>()
    const dispatches = [...productionRecords, ...byCreatedAt].filter((d) => {
      if (seen.has(d._id)) return false
      seen.add(d._id)
      return true
    })

    return await Promise.all(
      dispatches.map(async (dispatch) => {
        const [user, items] = await Promise.all([
          ctx.db.get(dispatch.userId),
          ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
            .collect(),
        ])

        const totalValue = items.reduce(
          (sum, item) => sum + item.quantityDeducted * item.unitCost,
          0
        )

        return {
          ...dispatch,
          userName: user?.name ?? "Unknown",
          itemCount: items.length,
          totalValue,
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
