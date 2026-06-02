import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

/**
 * Records an audit log entry. Internal mutation — called by other
 * mutations after state changes. Captures the request IP automatically.
 * @param userId - Optional ID of the user who performed the action.
 * @param action - The action name (e.g. "product_created").
 * @param description - Human-readable description of the event.
 * @param resourceType - Optional type of resource affected.
 * @param resourceId - Optional ID of the resource affected.
 * @param userAgent - Optional browser user agent string.
 * @param createdAt - Optional override timestamp in milliseconds.
 */
export const log = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    action: v.string(),
    description: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.optional(v.number()),
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
