import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
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

    const totalAssetValue = products.reduce(
      (sum, p) => sum + p.totalAssetValue,
      0
    )
    const activeProductCount = products.length
    const categories = new Set(products.map((p) => p.category))

    const stockAlerts = products
      .filter((p) => p.currentQuantity <= p.lowStockThreshold)
      .map((p) => ({
        productId: p._id,
        productName: p.name,
        currentQuantity: p.currentQuantity,
        lowStockThreshold: p.lowStockThreshold,
      }))

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
        const items = await ctx.db
          .query("dispatchItems")
          .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
          .collect()

        const ts = d.createdAt ?? d._creationTime
        const day = new Date(ts + tzOffset).getUTCDate()

        const totalQty = items.reduce(
          (sum, item) => sum + item.quantityDeducted,
          0
        )

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

    const dispatches = await fetchDispatches(ctx, startMs, endMs)

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
        const items = await ctx.db
          .query("dispatchItems")
          .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
          .collect()

        const ts = d.createdAt ?? d._creationTime
        const shifted = new Date(ts + tzOffset)
        const year = shifted.getUTCFullYear()
        const month = String(shifted.getUTCMonth() + 1).padStart(2, "0")
        const day = String(shifted.getUTCDate()).padStart(2, "0")
        const isoDate = `${year}-${month}-${day}`

        const totalQty = items.reduce(
          (sum, item) => sum + item.quantityDeducted,
          0
        )

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
