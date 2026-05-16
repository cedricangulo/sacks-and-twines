import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const suppliers = await ctx.db.query("suppliers").collect()

    return await Promise.all(
      suppliers.map(async (supplier) => {
        const batches = await ctx.db
          .query("batches")
          .filter((q) => q.eq(q.field("supplierId"), supplier._id))
          .collect()
        return { ...supplier, batchCount: batches.length }
      })
    )
  },
})

export const getById = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    return await ctx.db.get(supplierId)
  },
})
