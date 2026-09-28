import { getAuthUserId } from "@convex-dev/auth/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { filter } from "convex-helpers/server/filter"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { escapeCsv } from "../lib/csv_escape"

/**
 * Maximum audit-log rows a single export may return.
 *
 * Truncation is detected (not silent) and surfaced in the CSV footer, the JSON
 * payload and the audit record of the export. See
 * docs/PERFORMANCE-AUDIT.md P13.
 */
export const EXPORT_LIMIT = 2000

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
      // `by_userId_createdAt` already exists and is a superset of `by_userId`,
      // so the date range can be pushed to storage here rather than filtered
      // after the scan. `listByUser` was already doing this — the capability
      // just was not copied across.
      base = ctx.db.query("auditLogs").withIndex("by_userId_createdAt", (q) =>
        q
          .eq("userId", userId)
          .gte("createdAt", dateFrom ?? 0)
          .lte("createdAt", dateTo ?? Number.MAX_SAFE_INTEGER)
      )
    } else {
      base = ctx.db
        .query("auditLogs")
        .withIndex("by_createdAt", (q) =>
          q
            .gte("createdAt", dateFrom ?? 0)
            .lte("createdAt", dateTo ?? Number.MAX_SAFE_INTEGER)
        )
    }

    // Date bounds are pushed into the index above for the `by_createdAt` and
    // `by_userId_createdAt` branches. The `by_action` branches use indexes that
    // lack `createdAt` — adding `by_action_createdAt` would fix that but needs
    // a schema change plus the `backfillAuditLogCreatedAt` migration to have run
    // on the target deployment first. See docs/PERFORMANCE-AUDIT.md P8.
    if (dateFrom !== undefined && action !== undefined) {
      base = base.filter((q) => q.gte(q.field("createdAt"), dateFrom))
    }
    if (dateTo !== undefined && action !== undefined) {
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

    // Dedupe before reading — the page holds up to `numItems` rows but the users
    // table has only a handful of active users, so a per-row `db.get` would
    // re-read the same few documents up to 30 times.
    const pageUserIds = new Set(
      result.page
        .map((log) => log.userId)
        .filter((id): id is Id<"users"> => id !== undefined)
    )
    const userNames = new Map<Id<"users">, string | null>()
    await Promise.all(
      [...pageUserIds].map(async (id) => {
        userNames.set(id, (await ctx.db.get(id))?.name ?? null)
      })
    )

    return {
      ...result,
      page: result.page.map((log) => ({
        ...log,
        userName:
          log.userId === undefined ? null : (userNames.get(log.userId) ?? null),
      })),
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

    // Every branch above ranges on `eq("userId", callerId)`, so every log on the
    // page provably belongs to the caller — and `caller` is already in scope.
    // `userName` is therefore a constant; reading it per row was 30 identical
    // point reads of one document on every page turn.
    const callerName = caller.name ?? null

    return {
      ...result,
      page: result.page.map((log) => ({
        ...log,
        userName: log.userId === callerId ? callerName : null,
      })),
    }
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
    // Same as `list`: `by_userId_createdAt` pushes the date range to storage.
    base = ctx.db.query("auditLogs").withIndex("by_userId_createdAt", (q) =>
      q
        .eq("userId", userId)
        .gte("createdAt", dateFrom ?? 0)
        .lte("createdAt", dateTo ?? Number.MAX_SAFE_INTEGER)
    )
  } else {
    // Both bounds must reach the index here — the JS fallback below only
    // applies to the `by_action` branches.
    base = ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt", (q) =>
        q
          .gte("createdAt", dateFrom ?? 0)
          .lte("createdAt", dateTo ?? Number.MAX_SAFE_INTEGER)
      )
  }

  // Only the `by_action` branches still filter in JS — see the note in `list`.
  if (dateFrom !== undefined && action !== undefined) {
    base = base.filter((q) => q.gte(q.field("createdAt"), dateFrom))
  }
  if (dateTo !== undefined && action !== undefined) {
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

  // Over-fetch by one so truncation is detectable. Previously the result was
  // silently cut at 2000 and that truncated length flowed into the audit record
  // of the export itself — so the audit trail recorded a count that was false.
  // See docs/PERFORMANCE-AUDIT.md P13.
  const overFetched = await base.order("desc").take(EXPORT_LIMIT + 1)
  const truncated = overFetched.length > EXPORT_LIMIT
  const logs = truncated ? overFetched.slice(0, EXPORT_LIMIT) : overFetched

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

  return {
    records: logs.map((log) => {
      const user = log.userId ? userMap.get(log.userId) : null
      return {
        ...log,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        userRole: user?.role ?? null,
      }
    }),
    truncated,
    limit: EXPORT_LIMIT,
  }
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
    const {
      records: enriched,
      truncated,
      limit,
    } = await fetchExportLogs(ctx, args)

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

    // A silent cap on a compliance export is indistinguishable from the whole
    // dataset downstream, so say so in the file itself.
    const footer = truncated
      ? `\n# TRUNCATED: contains the ${limit} most recent matching records only. Older records exist — narrow the date range or split the export.`
      : ""

    return "\uFEFF" + header.join(",") + "\n" + rows.join("\n") + footer
  },
})
