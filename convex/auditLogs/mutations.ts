import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

export const log = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    action: v.string(),
    description: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let ip: string | undefined | null
    try {
      const meta = await ctx.meta.getRequestMetadata()
      ip = meta.ip
    } catch {
      ip = undefined
    }
    await ctx.db.insert("auditLogs", {
      ...args,
      ipAddress: ip ?? undefined,
    })
  },
})
