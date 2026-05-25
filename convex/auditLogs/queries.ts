import { getAuthUserId } from "@convex-dev/auth/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { filter } from "convex-helpers/server/filter"
import type { Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"

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
      base = ctx.db.query("auditLogs")
    }

    if (dateFrom !== undefined) {
      base = base.filter((q) => q.gte(q.field("_creationTime"), dateFrom))
    }
    if (dateTo !== undefined) {
      base = base.filter((q) => q.lte(q.field("_creationTime"), dateTo))
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

export const listByUser = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.status !== "active") throw new Error("Unauthorized")

    const result = await ctx.db
      .query("auditLogs")
      .withIndex("by_userId", (q) => q.eq("userId", callerId))
      .order("desc")
      .paginate(paginationOpts)

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

export const listActions = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const logs = await ctx.db.query("auditLogs").order("desc").take(5000)
    const actions = [...new Set(logs.map((l) => l.action))]
    return actions.sort()
  },
})

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
    base = ctx.db.query("auditLogs")
  }

  if (dateFrom !== undefined) {
    base = base.filter((q) => q.gte(q.field("_creationTime"), dateFrom))
  }
  if (dateTo !== undefined) {
    base = base.filter((q) => q.lte(q.field("_creationTime"), dateTo))
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

  const logs = await base.order("desc").take(10000)

  return await Promise.all(
    logs.map(async (log) => {
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
    })
  )
}

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

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return ""
      const s = String(val)
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

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
