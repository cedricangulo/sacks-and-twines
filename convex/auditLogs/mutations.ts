import { v } from "convex/values"
import { internalMutation, mutation } from "../_generated/server"
import { requireOwner } from "../auth/guards"

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

/**
 * Logs an audit log export action. Callable from the client after
 * an owner exports audit logs as CSV or JSON. Records who exported,
 * what format, and the filter parameters used.
 */
export const logExport = mutation({
  args: {
    format: v.string(),
    recordCount: v.number(),
    filters: v.optional(v.string()),
  },
  handler: async (ctx, { format, recordCount, filters }) => {
    const userId = await requireOwner(ctx)

    await ctx.db.insert("auditLogs", {
      userId,
      action: "audit_log_export",
      description: JSON.stringify({
        summary: `Exported ${recordCount} audit log(s) as ${format.toUpperCase()}`,
        details: { format, recordCount, filters: filters ?? null },
      }),
      resourceType: "auditLog",
      userAgent: undefined,
    })
  },
})
