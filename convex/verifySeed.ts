import { query } from "./_generated/server"
import { DENSE_DAYS, SEED_DATE_END } from "./lib/constants"

export const verifyDense = query({
  args: {},
  handler: async (ctx) => {
    const dayMs = 24 * 60 * 60 * 1000
    const end = new Date(`${SEED_DATE_END}T00:00:00+08:00`)
    const start = new Date(end.getTime() - (DENSE_DAYS - 1) * dayMs)
    const counts: Record<string, number> = {}
    const dispatches = await ctx.db.query("dispatches").collect()
    for (const d of dispatches) {
      const t = d.createdAt ?? 0
      if (t < start.getTime() || t >= end.getTime() + dayMs) continue
      const local = new Date(t + 8 * 3600 * 1000)
      const day = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`
      counts[day] = (counts[day] ?? 0) + 1
    }
    let min = Infinity
    let minDay = ""
    const below = []
    for (const [k, v] of Object.entries(counts)) {
      if (v < min) {
        min = v
        minDay = k
      }
      if (v < 20) below.push(`${k}:${v}`)
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}:${v}`)
    return {
      expectedDays: DENSE_DAYS,
      daysWithDispatches: Object.keys(counts).length,
      minPerDay: min === Infinity ? 0 : min,
      minDay,
      belowTwenty: below,
      sorted,
    }
  },
})
