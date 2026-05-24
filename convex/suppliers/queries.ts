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
        if (supplier.batchCount !== undefined) {
          return { ...supplier, batchCount: supplier.batchCount }
        }
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_supplier", (q) => q.eq("supplierId", supplier._id))
          .collect()
        return { ...supplier, batchCount: batches.length }
      })
    )
  },
})

export const listActiveOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const suppliers = await ctx.db.query("suppliers").collect()

    return suppliers
      .filter((s) => s.archivedAt === undefined)
      .map((s) => ({ _id: s._id, companyName: s.companyName }))
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
