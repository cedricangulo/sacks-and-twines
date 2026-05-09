import { query } from "../_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "staff"))
      .collect()

    const results: Array<{
      user: Record<string, unknown>
      profile: Record<string, unknown>
    }> = []
    for (const p of profiles) {
      const user = await ctx.db.get(p._id)
      if (user) results.push({ user, profile: p })
    }
    return results
  },
})
