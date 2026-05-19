import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

export const list = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    createdByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { startMs, endMs, createdByUserId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    let q = ctx.db
      .query("dispatches")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", startMs).lte("createdAt", endMs)
      )
      .order("desc")

    if (createdByUserId) {
      q = q.filter((f) => f.eq(f.field("userId"), createdByUserId))
    }

    const dispatches = await q.collect()

    return await Promise.all(
      dispatches.map(async (dispatch) => {
        if (dispatch.userName !== undefined && dispatch.itemCount !== undefined) {
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
