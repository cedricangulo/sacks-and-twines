import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { fetchDispatches } from "../lib/fetch_entities"

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Summary statistics for the dashboard header card row.
 * Returns total asset value, active product count, distinct categories,
 * and products currently at or below their low-stock threshold.
 *
 * Access: Owner only.
 */
export const summaryStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    // Single pass — avoids 3 iterations over `products`.
    let totalAssetValue = 0
    const categories = new Set<string>()
    const stockAlerts: Array<{
      productId: (typeof products)[number]["_id"]
      productName: string
      currentQuantity: number
      lowStockThreshold: number
    }> = []
    for (const p of products) {
      totalAssetValue += p.totalAssetValue
      categories.add(p.category)
      if (p.currentQuantity <= p.lowStockThreshold) {
        stockAlerts.push({
          productId: p._id,
          productName: p.name,
          currentQuantity: p.currentQuantity,
          lowStockThreshold: p.lowStockThreshold,
        })
      }
    }
    const activeProductCount = products.length

    return {
      totalAssetValue,
      activeProductCount,
      categoryCount: categories.size,
      stockAlerts,
    }
  },
})

/**
 * Daily dispatch volume for the current month area chart.
 * Returns the total quantity deducted per calendar day within the range,
 * along with how many completed dispatches contributed to that day.
 *
 * Access: Owner only.
 */
export const dailyDispatchVolume = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    timezoneOffsetMs: v.optional(v.number()),
  },
  handler: async (ctx, { startMs, endMs, timezoneOffsetMs }) => {
    const tzOffset = timezoneOffsetMs ?? 0
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const dispatches = await fetchDispatches(ctx, startMs, endMs, "completed")

    const dayMap = new Map<number, { units: number; dispatchCount: number }>()

    await Promise.all(
      dispatches.map(async (d) => {
        let totalQty = d.totalQuantity
        if (totalQty === undefined) {
          const items = await ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
            .collect()
          totalQty = items.reduce((sum, item) => sum + item.quantityDeducted, 0)
        }

        const ts = d.createdAt ?? d._creationTime
        const day = new Date(ts + tzOffset).getUTCDate()

        if (totalQty > 0) {
          const entry = dayMap.get(day) ?? { units: 0, dispatchCount: 0 }
          entry.units += totalQty
          entry.dispatchCount += 1
          dayMap.set(day, entry)
        }
      })
    )

    return Array.from(dayMap.entries())
      .map(([day, entry]) => ({
        day,
        value: Math.round(entry.units),
        dispatchCount: entry.dispatchCount,
      }))
      .sort((a, b) => a.day - b.day)
  },
})

/**
 * Weekly dispatch velocity heatmap data.
 * Counts dispatches grouped by day-of-week (0–6, Sun–Sat) and hour
 * (8–18, business hours only). Returns a flat array of cells.
 *
 * The frontend builds a 7×11 CSS grid from these entries and uses
 * a 5-step colour scale based on relative counts.
 *
 * Access: Owner only.
 */
export const weeklyVelocity = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    timezoneOffsetMs: v.optional(v.number()),
  },
  handler: async (ctx, { startMs, endMs, timezoneOffsetMs }) => {
    const tzOffset = timezoneOffsetMs ?? 0
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    // Bound the heatmap scan to the longest selectable preset (90 days) so a
    // stray unbounded startMs can never rescan the whole dispatch table.
    const VELOCITY_WINDOW_MS = 13 * 7 * 24 * 60 * 60 * 1000
    const effectiveStartMs = Math.max(startMs, Date.now() - VELOCITY_WINDOW_MS)

    const dispatches = await fetchDispatches(ctx, effectiveStartMs, endMs)

    const cellMap = new Map<string, number>()

    for (const d of dispatches) {
      const ts = d.createdAt ?? d._creationTime
      const date = new Date(ts + tzOffset)
      const dayOfWeek = date.getUTCDay()
      const hour = date.getUTCHours()

      if (hour < 8 || hour > 18) continue

      const key = `${dayOfWeek}-${hour}`
      cellMap.set(key, (cellMap.get(key) ?? 0) + 1)
    }

    return Array.from(cellMap.entries()).map(([key, count]) => {
      const [dayStr, hourStr] = key.split("-")
      return {
        dayOfWeek: Number(dayStr),
        hour: Number(hourStr),
        count,
      }
    })
  },
})

/**
 * Product movement ranking for the Product Movement card.
 *
 * Aggregates units sold (sum of dispatchItems.quantityDeducted) per active
 * product across completed dispatches in the given window, returning one
 * entry per active product (units 0 when nothing sold). The client selects
 * the top-5 fastest and bottom-5 slowest and classifies velocity.
 *
 * Access: Owner only.
 */
export const productMovement = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const dispatches = await fetchDispatches(ctx, startMs, endMs, "completed")

    // TODO(scale): N+1 query — one dispatchItems read per dispatch. At current
    // volume (~50/month) this is fine. If it grows, denormalize a
    // productBreakdown field on dispatches at write time (same pattern as
    // totalQuantity) and read it directly here.
    const unitsByProduct = new Map<Id<"products">, number>()
    await Promise.all(
      dispatches.map(async (d) => {
        const items = await ctx.db
          .query("dispatchItems")
          .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
          .collect()
        for (const item of items) {
          unitsByProduct.set(
            item.productId,
            (unitsByProduct.get(item.productId) ?? 0) + item.quantityDeducted
          )
        }
      })
    )

    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    return products.map((p) => ({
      productId: p._id,
      productName: p.name,
      unitsSold: Math.round(unitsByProduct.get(p._id) ?? 0),
    }))
  },
})

/**
 * Weekly demand data for the predictive vs. actual comparison chart.
 *
 * Returns daily dispatch volume covering the current month PLUS the
 * preceding 4 weeks. The client-side forecast utility uses the trailing
 * weeks to compute a moving-average prediction for each current-month
 * week, then both series are rendered side-by-side as grouped bars.
 *
 * Access: Owner only.
 */
export const weeklyDemand = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    timezoneOffsetMs: v.optional(v.number()),
  },
  handler: async (ctx, { startMs, endMs, timezoneOffsetMs }) => {
    const tzOffset = timezoneOffsetMs ?? 0
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const fourWeeksMs = 4 * 7 * 24 * 60 * 60 * 1000
    const historyStartMs = startMs - fourWeeksMs

    const dispatches = await fetchDispatches(
      ctx,
      historyStartMs,
      endMs,
      "completed"
    )

    const dayMap = new Map<string, number>()

    await Promise.all(
      dispatches.map(async (d) => {
        let totalQty = d.totalQuantity
        if (totalQty === undefined) {
          const items = await ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
            .collect()
          totalQty = items.reduce((sum, item) => sum + item.quantityDeducted, 0)
        }

        const ts = d.createdAt ?? d._creationTime
        const shifted = new Date(ts + tzOffset)
        const year = shifted.getUTCFullYear()
        const month = String(shifted.getUTCMonth() + 1).padStart(2, "0")
        const day = String(shifted.getUTCDate()).padStart(2, "0")
        const isoDate = `${year}-${month}-${day}`

        if (totalQty > 0) {
          dayMap.set(isoDate, (dayMap.get(isoDate) ?? 0) + totalQty)
        }
      })
    )

    return Array.from(dayMap.entries())
      .map(([date, value]) => ({
        date,
        value: Math.round(value),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  },
})
