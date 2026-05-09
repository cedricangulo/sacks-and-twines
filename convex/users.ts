import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internalQuery, query } from "./_generated/server"

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (userId === null) {
      return null
    }
    return await ctx.db.get(userId)
  },
})

export const getOwnerByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first()
  },
})
