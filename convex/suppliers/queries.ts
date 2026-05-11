import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect()
  },
})

export const getById = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    return await ctx.db.get(supplierId)
  },
})
