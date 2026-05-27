import { v } from "convex/values"
import { mutation } from "../_generated/server"

/**
 * Records an authentication attempt (success or failure) in the audit log.
 * Looks up the user by email and captures the request IP for audit trail.
 */
export const logAttempt = mutation({
  args: {
    action: v.string(),
    email: v.string(),
    resourceType: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique()
    const userId = user?._id

    let ip: string | undefined
    try {
      const meta = await ctx.meta.getRequestMetadata()
      ip = meta.ip ?? undefined
    } catch {
      // request metadata not available in all contexts
    }

    await ctx.db.insert("auditLogs", {
      userId,
      action: args.action,
      description: JSON.stringify({
        summary:
          args.action === "auth_sign_in"
            ? `User ${args.email} signed in`
            : `Failed sign-in for ${args.email}`,
        details: { email: args.email },
      }),
      resourceType: args.resourceType,
      resourceId: userId,
      ipAddress: ip,
      userAgent: args.userAgent,
    })
  },
})
