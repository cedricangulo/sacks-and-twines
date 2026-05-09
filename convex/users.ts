import { getAuthUserId } from "@convex-dev/auth/server"
import { query } from "./_generated/server"

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (userId === null) {
      throw new Error("Client is not authenticated!")
    }
    return await ctx.db.get(userId)
  },
})
