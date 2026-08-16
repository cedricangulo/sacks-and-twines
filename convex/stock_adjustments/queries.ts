import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import { fetchAdjustments } from "../lib/fetch_entities"

/**
 * Lists stock adjustments within a date range, optionally filtered by creator.
 * Enriches each adjustment with product name, batch code, and user name.
 * When createdByUserId is provided, filters in memory after the range read —
 * no compound index exists yet.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 * @param createdByUserId - Optional user ID to filter by creator.
 */
export const listByDateRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    createdByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { startMs, endMs, createdByUserId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const merged = await fetchAdjustments(ctx, startMs, endMs)

    const filtered = createdByUserId
      ? merged.filter((a) => a.userId === createdByUserId)
      : merged

    const uniqueProductIds = [...new Set(filtered.map((a) => a.productId))]
    const uniqueBatchIds = [...new Set(filtered.map((a) => a.batchId))]
    const uniqueUserIds = [...new Set(filtered.map((a) => a.userId))]

    const [productMap, batchMap, userMap] = await Promise.all([
      Promise.all(
        uniqueProductIds.map(async (id) => [id, await ctx.db.get(id)] as const)
      ).then(Object.fromEntries),
      Promise.all(
        uniqueBatchIds.map(async (id) => [id, await ctx.db.get(id)] as const)
      ).then(Object.fromEntries),
      Promise.all(
        uniqueUserIds.map(async (id) => [id, await ctx.db.get(id)] as const)
      ).then(Object.fromEntries),
    ])

    return filtered.map((adjustment) => ({
      ...adjustment,
      productName: productMap[adjustment.productId]?.name ?? "Unknown",
      batchCode: batchMap[adjustment.batchId]?.batchCode ?? "Unknown",
      userName: userMap[adjustment.userId]?.name ?? "Unknown",
    }))
  },
})
