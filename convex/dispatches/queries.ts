import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import {
  fetchDispatches,
  fetchDispatchesOrdered,
  UNBOUNDED_RANGE_LIMIT,
} from "../lib/fetch_entities"

/**
 * Lists dispatches within a date range, optionally filtered by creator.
 * Enriches each dispatch with the user's display name and item count.
 * Uses `by_userId_createdAt` index when filtering by user; default ordering otherwise.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 * @param createdByUserId - Optional user ID to filter by creator.
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

    const allDispatches = createdByUserId
      ? await ctx.db
          .query("dispatches")
          .withIndex("by_userId_createdAt", (q) =>
            q
              .eq("userId", createdByUserId)
              .gte("createdAt", startMs)
              .lte("createdAt", endMs)
          )
          .order("desc")
          .take(500)
      : (await fetchDispatchesOrdered(ctx, startMs, endMs, 500)).docs
    // Both branches above range on `createdAt` with `gte`/`lte`, so the window is
    // already applied by the index — no second JS filter is needed.
    const dispatches = allDispatches

    return await Promise.all(
      dispatches.map(async (dispatch) => {
        if (
          dispatch.userName !== undefined &&
          dispatch.itemCount !== undefined &&
          dispatch.totalQuantity !== undefined
        ) {
          return {
            ...dispatch,
            userName: dispatch.userName,
            itemCount: dispatch.itemCount,
            totalQuantity: dispatch.totalQuantity,
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
          totalQuantity: items.reduce(
            (sum, item) => sum + item.dispatchQuantity,
            0
          ),
        }
      })
    )
  },
})

/**
 * Lists dispatches within a date range for the reports detail panel.
 * Enriches each dispatch with user name, item count, and total value.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export const listByDateRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    // `"desc"`: this feeds the reports detail panel, so a range wide enough to
    // hit the read ceiling must keep the newest dispatches rather than the
    // oldest. Without it a capped read silently drops recent activity.
    const { docs: dispatches } = await fetchDispatches(
      ctx,
      startMs,
      endMs,
      undefined,
      UNBOUNDED_RANGE_LIMIT,
      "desc"
    )

    return await Promise.all(
      dispatches.map(async (dispatch) => {
        if (
          dispatch.userName !== undefined &&
          dispatch.itemCount !== undefined &&
          dispatch.totalValue !== undefined
        ) {
          return {
            ...dispatch,
            userName: dispatch.userName,
            itemCount: dispatch.itemCount,
            totalValue: dispatch.totalValue,
          }
        }
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
 * @param dispatchId - ID of the dispatch to fetch items for.
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
          baseUom: product?.baseUom ?? "",
          conversionFactor: product?.conversionFactor ?? 0,
          lineTotal: item.quantityDeducted * item.unitCost,
        }
      })
    )
  },
})
