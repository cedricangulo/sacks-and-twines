import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Returns daily transaction counts for a given month range.
 * Used by the calendar view to render dispatch/adjustment count badges.
 * Uses default ordering (by _creationTime) with in-code date filtering.
 */
export const calendarSummary = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const [allDispatches, allAdjustments] = await Promise.all([
      ctx.db.query("dispatches").order("desc").take(1000),
      ctx.db.query("stockAdjustments").order("desc").take(1000),
    ])

    const dispatches = allDispatches.filter(
      (d) => d._creationTime >= startMs && d._creationTime <= endMs
    )
    const adjustments = allAdjustments.filter(
      (a) => a._creationTime >= startMs && a._creationTime <= endMs
    )

    const dayBuckets: Record<
      number,
      { dispatchCount: number; adjustmentCount: number }
    > = {}

    for (const d of dispatches) {
      const day = Math.floor(d._creationTime / 86400000)
      if (!dayBuckets[day])
        dayBuckets[day] = { dispatchCount: 0, adjustmentCount: 0 }
      dayBuckets[day].dispatchCount++
    }

    for (const a of adjustments) {
      const day = Math.floor(a._creationTime / 86400000)
      if (!dayBuckets[day])
        dayBuckets[day] = { dispatchCount: 0, adjustmentCount: 0 }
      dayBuckets[day].adjustmentCount++
    }

    return Object.entries(dayBuckets).map(([day, counts]) => ({
      day: Number(day),
      ...counts,
    }))
  },
})
