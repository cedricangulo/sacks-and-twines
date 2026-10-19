import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Lists all suppliers. `batchCount` is read from the denormalized field,
 * maintained by `stockIn` and seeded directly.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    return await ctx.db.query("suppliers").collect()
  },
})

/**
 * Lists non-archived suppliers as simple id/name pairs for dropdown options.
 */
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

/**
 * Fetches a single supplier by ID.
 */
export const getById = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    return await ctx.db.get(supplierId)
  },
})
