import { getAuthUserId } from "@convex-dev/auth/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { filter } from "convex-helpers/server/filter"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { escapeCsv } from "../lib/csv_escape"

/**
 * Paginated audit log listing with optional filters (search, action, user, date range).
 * Enriches each log with the acting user's name. Owner-only access.
 * @param paginationOpts - Pagination options for cursor-based navigation.
 * @param search - Optional search string to filter by action or description.
 * @param action - Optional action type to filter by.
 * @param userId - Optional user ID to filter by.
 * @param dateFrom - Optional start of date range in milliseconds.
 * @param dateTo - Optional end of date range in milliseconds.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    action: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { paginationOpts, search, action, userId, dateFrom, dateTo }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    let base

    if (action && userId) {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_action_userId", (q) =>
          q.eq("action", action).eq("userId", userId)
        )
    } else if (action) {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", action))
    } else if (userId) {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
    } else {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
    }

    if (dateFrom !== undefined) {
      base = base.filter((q) => q.gte(q.field("createdAt"), dateFrom))
    }
    if (dateTo !== undefined) {
      base = base.filter((q) => q.lte(q.field("createdAt"), dateTo))
    }

    if (search) {
      const q = search.toLowerCase()
      base = filter(
        base,
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q)
      )
    }

    const result = await base.order("desc").paginate(paginationOpts)

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (log) => {
          let userName: string | null = null
          if (log.userId) {
            const user = await ctx.db.get(log.userId)
            userName = user?.name ?? null
          }
          return { ...log, userName }
        })
      ),
    }
  },
})

/**
 * Fetches a single audit log entry with full user details.
 * Owner-only access.
 * @param logId - ID of the audit log entry to fetch.
 */
export const getById = query({
  args: { logId: v.id("auditLogs") },
  handler: async (ctx, { logId }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const log = await ctx.db.get(logId)
    if (!log) return null

    let userName: string | null = null
    let userEmail: string | null = null
    let userRole: string | null = null
    if (log.userId) {
      const user = await ctx.db.get(log.userId)
      if (user) {
        userName = user.name ?? null
        userEmail = user.email
        userRole = user.role ?? null
      }
    }

    return { ...log, userName, userEmail, userRole }
  },
})

/**
 * Fetches an audit log entry owned by the current user.
 * Users can only view their own logs.
 * @param logId - ID of the audit log entry to fetch.
 */
export const getPersonalById = query({
  args: { logId: v.id("auditLogs") },
  handler: async (ctx, { logId }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.status !== "active") throw new Error("Unauthorized")

    const log = await ctx.db.get(logId)
    if (!log) return null
    if (log.userId !== callerId) throw new Error("Unauthorized")

    const userName = caller.name ?? null
    const userEmail = caller.email
    const userRole = caller.role ?? null

    return { ...log, userName, userEmail, userRole }
  },
})

/**
 * Paginated audit log listing filtered to the current user's own actions.
 * Any active user can view their own audit trail.
 * @param paginationOpts - Pagination options for cursor-based navigation.
 */
export const listByUser = query({
  args: {
    paginationOpts: paginationOptsValidator,
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { paginationOpts, dateFrom, dateTo }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.status !== "active") throw new Error("Unauthorized")

    let base

    if (dateFrom !== undefined && dateTo !== undefined) {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_userId_createdAt", (q) =>
          q
            .eq("userId", callerId)
            .gte("createdAt", dateFrom)
            .lte("createdAt", dateTo)
        )
    } else if (dateFrom !== undefined) {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_userId_createdAt", (q) =>
          q.eq("userId", callerId).gte("createdAt", dateFrom)
        )
    } else if (dateTo !== undefined) {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_userId_createdAt", (q) =>
          q.eq("userId", callerId).lte("createdAt", dateTo)
        )
    } else {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_userId_createdAt", (q) =>
          q.eq("userId", callerId).gte("createdAt", 0)
        )
    }

    const result = await base.order("desc").paginate(paginationOpts)

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (log) => {
          let userName: string | null = null
          if (log.userId) {
            const user = await ctx.db.get(log.userId)
            userName = user?.name ?? null
          }
          return { ...log, userName }
        })
      ),
    }
  },
})

/**
 * Returns the distinct set of audit action types that exist in the logs.
 * Owner-only access.
 */
export const listActions = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const logs = await ctx.db.query("auditLogs").order("desc").take(500)
    const actions = [...new Set(logs.map((l) => l.action))]
    return actions.sort()
  },
})

/**
 * Shared helper that fetches filtered audit logs with user enrichment.
 * Used by both `exportData` and `exportCsv` queries.
 * @param ctx - Query context.
 * @param search - Optional search string to filter by action or description.
 * @param action - Optional action type to filter by.
 * @param userId - Optional user ID to filter by.
 * @param dateFrom - Optional start of date range in milliseconds.
 * @param dateTo - Optional end of date range in milliseconds.
 */
async function fetchExportLogs(
  ctx: QueryCtx,
  args: {
    search?: string
    action?: string
    userId?: Id<"users">
    dateFrom?: number
    dateTo?: number
  }
) {
  const { search, action, userId, dateFrom, dateTo } = args
  const callerId = await getAuthUserId(ctx)
  if (callerId === null) throw new Error("Unauthorized")

  const caller = await ctx.db.get(callerId)
  if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

  let base

  if (action && userId) {
    base = ctx.db
      .query("auditLogs")
      .withIndex("by_action_userId", (q) =>
        q.eq("action", action).eq("userId", userId)
      )
  } else if (action) {
    base = ctx.db
      .query("auditLogs")
      .withIndex("by_action", (q) => q.eq("action", action))
  } else if (userId) {
    base = ctx.db
      .query("auditLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
  } else {
    base = ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
  }

  if (dateFrom !== undefined) {
    base = base.filter((q) => q.gte(q.field("createdAt"), dateFrom))
  }
  if (dateTo !== undefined) {
    base = base.filter((q) => q.lte(q.field("createdAt"), dateTo))
  }

  if (search) {
    const q = search.toLowerCase()
    base = filter(
      base,
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q)
    )
  }

  const logs = await base.order("desc").take(2000)

  const userIdSet = new Set(
    logs
      .map((log) => log.userId)
      .filter((id): id is Id<"users"> => id !== undefined)
  )
  const userMap = new Map<
    string,
    { name: string | null; email: string; role: string | null }
  >()
  await Promise.all(
    [...userIdSet].map(async (id) => {
      const user = await ctx.db.get(id)
      if (user) {
        userMap.set(id, {
          name: user.name ?? null,
          email: user.email,
          role: user.role ?? null,
        })
      }
    })
  )

  return logs.map((log) => {
    const user = log.userId ? userMap.get(log.userId) : null
    return {
      ...log,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
    }
  })
}

/**
 * Exports filtered audit logs as a JSON-friendly array of enriched records.
 * Owner-only access.
 * @param search - Optional search string to filter by action or description.
 * @param action - Optional action type to filter by.
 * @param userId - Optional user ID to filter by.
 * @param dateFrom - Optional start of date range in milliseconds.
 * @param dateTo - Optional end of date range in milliseconds.
 */
export const exportData = query({
  args: {
    search: v.optional(v.string()),
    action: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await fetchExportLogs(ctx, args)
  },
})

/**
 * Exports filtered audit logs as a CSV string (UTF-8 BOM prefixed).
 * Includes timestamp, user, action, resource, and description columns.
 * Owner-only access.
 * @param search - Optional search string to filter by action or description.
 * @param action - Optional action type to filter by.
 * @param userId - Optional user ID to filter by.
 * @param dateFrom - Optional start of date range in milliseconds.
 * @param dateTo - Optional end of date range in milliseconds.
 */
export const exportCsv = query({
  args: {
    search: v.optional(v.string()),
    action: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const enriched = await fetchExportLogs(ctx, args)

    const header = [
      "Timestamp",
      "User",
      "Email",
      "Role",
      "Action",
      "Resource Type",
      "Resource ID",
      "Description",
      "IP Address",
      "User Agent",
    ]

    const rows = enriched.map((log) =>
      [
        log._creationTime,
        log.userName,
        log.userEmail,
        log.userRole,
        log.action,
        log.resourceType,
        log.resourceId,
        log.description,
        log.ipAddress,
        log.userAgent,
      ]
        .map(escapeCsv)
        .join(",")
    )

    return "\uFEFF" + header.join(",") + "\n" + rows.join("\n")
  },
})
