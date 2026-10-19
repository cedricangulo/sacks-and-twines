import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import {
  fetchAdjustments,
  fetchDispatches,
  UNBOUNDED_RANGE_LIMIT,
} from "../lib/fetch_entities"

/**
 * Ceiling on the single `dispatchItems` window read in
 * `fetchItemsByDispatch`. See the comment there for why one range still needs a
 * bound on top of `itemCount`.
 */
const WINDOW_ITEM_READ_LIMIT = 20_000

/**
 * Groups a window's `dispatchItems` by dispatch id.
 *
 * Fast path: ONE `dispatchItems.by_createdAt` index range over the window,
 * instead of one `by_dispatch` range per dispatch. `dispatchItems.createdAt` is
 * written by `dispatches.mutations.submit` and backfilled by
 * `backfillDispatchItemCreatedAt`.
 *
 * Because the fast path depends on every item in the window carrying
 * `createdAt`, it is used only once a per-dispatch read count proves it is
 * complete: if any dispatch's grouped item count disagrees with its
 * `itemCount`, we fall back to the per-dispatch `by_dispatch` ranges. That keeps
 * the export correct on deployments where the backfill has not run yet, rather
 * than silently dropping pre-backfill rows. See docs/PERFORMANCE-AUDIT.md P9.
 */
async function fetchItemsByDispatch(
  ctx: QueryCtx,
  dispatches: Doc<"dispatches">[],
  window: { startMs: number; endMs: number }
): Promise<Doc<"dispatchItems">[][]> {
  const byDispatch = new Map<Id<"dispatches">, Doc<"dispatchItems">[]>()

  // `dispatches.itemCount` is the denormalized count written by `submit` and by
  // the dispatch-total backfills, so the window read can be bounded instead of
  // collecting every `dispatchItems` row in the range. Dispatches without the
  // field contribute 0 here and are caught by the completeness check below.
  const expectedItems = dispatches.reduce(
    (sum, d) => sum + (d.itemCount ?? 0),
    0
  )

  if (expectedItems > 0) {
    // Descending, because `fetchDispatches` hands back the *newest* dispatches in
    // the window once the export cap applies — the matching rows are the newest
    // items, so an ascending take would read past them and starve the dispatches
    // actually being exported. `+1` over-fetches so the cap itself is visible to
    // the caller as a shortfall against `expectedItems`.
    //
    // The second clamp keeps one range inside Convex's 32,000-document query
    // limit: an export can hold 5,000 dispatches, and the surrounding product /
    // batch / user point reads need headroom. Clamping below what `itemCount`
    // promises fails the completeness check below, which routes to the
    // per-dispatch path rather than reporting a short export as complete.
    // `desc` matches the order the `fetchDispatches` callers above request for
    // export paths, so the read covers the same end of the range the caller kept
    // and the `itemCount` completeness check below can succeed on the fast path.
    // It is not an optimisation on its own — the check below is what makes the
    // result correct regardless, falling back to per-dispatch reads when the
    // window read and the dispatch list disagree.
    const inWindow = await ctx.db
      .query("dispatchItems")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", window.startMs).lte("createdAt", window.endMs)
      )
      .order("desc")
      .take(Math.min(expectedItems + 1, WINDOW_ITEM_READ_LIMIT))

    for (const item of inWindow) {
      const list = byDispatch.get(item.dispatchId)
      if (list) list.push(item)
      else byDispatch.set(item.dispatchId, [item])
    }

    // Per-dispatch check rather than the aggregate count: a dispatch missing
    // `itemCount` while its items are also missing `createdAt` under-counts the
    // sum, so the aggregate check would pass while silently dropping rows.
    //
    // Requiring `itemCount` on *every* dispatch means the fast path is available
    // only once `backfillDispatchItemTotalQuantities` has run. Until then this
    // falls back to per-dispatch reads — slower, but the export stays correct
    // during the rollout window.
    const complete = dispatches.every(
      (d) =>
        d.itemCount !== undefined &&
        byDispatch.get(d._id)?.length === d.itemCount
    )

    if (complete) {
      // A dispatch with no items in the window must still get an empty array so
      // positional indexing stays aligned with `dispatches`.
      return dispatches.map((d) => byDispatch.get(d._id) ?? [])
    }
  }

  return Promise.all(
    dispatches.map((d) =>
      ctx.db
        .query("dispatchItems")
        .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
        .collect()
    )
  )
}

/**
 * Loads many documents by id in parallel into a `Map`, so N rows referencing M
 * distinct parents cost M reads instead of N.
 *
 * Callers pass a deduplicated id list. Only fully-populated entries land in the
 * map, so a missing document still falls back to the caller's `??` default
 * rather than masking it with a null. Mirrors the pattern in
 * `convex/stock_adjustments/queries.ts`. See
 * `.agents/skills/convex-performance-audit/references/hot-path-rules.md`.
 */
async function loadProductNames(
  ctx: QueryCtx,
  ids: Id<"products">[]
): Promise<Map<Id<"products">, string>> {
  const out = new Map<Id<"products">, string>()
  await Promise.all(
    ids.map(async (id) => {
      const product = await ctx.db.get(id)
      if (product) out.set(id, product.name)
    })
  )
  return out
}

async function loadUsers(
  ctx: QueryCtx,
  ids: Id<"users">[]
): Promise<Map<Id<"users">, Doc<"users">>> {
  const out = new Map<Id<"users">, Doc<"users">>()
  await Promise.all(
    ids.map(async (id) => {
      const doc = await ctx.db.get(id)
      if (doc) out.set(id, doc)
    })
  )
  return out
}

/** Same as `loadProductNames`, for `batches.batchCode`. */
async function loadBatchCodes(
  ctx: QueryCtx,
  ids: Id<"batches">[]
): Promise<Map<Id<"batches">, string>> {
  const out = new Map<Id<"batches">, string>()
  await Promise.all(
    ids.map(async (id) => {
      const batch = await ctx.db.get(id)
      if (batch) out.set(id, batch.batchCode)
    })
  )
  return out
}

/**
 * Returns aggregate counts and totals for dispatches and adjustments within a
 * date range, plus the distinct dispatch/adjustment timestamps the calendar
 * grid needs to mark days.
 *
 * The timestamps used to come from a separate `calendarSummary` query. Both were
 * mounted simultaneously with the same `startMs`/`endMs`, so the
 * `stockAdjustments.by_createdAt` month range was read **twice** per reports
 * load. Folding them together takes `/reports` from 3 invocations to 2.
 *
 * The frontend buckets by day using its local timezone.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export const monthlyAggregates = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    // One `by_createdAt` index range over the month. Dispatches carry no
    // status — every stored dispatch is a completed one — so a single read
    // serves both the totals and the calendar grid.
    const { docs: dispatches, truncated } = await fetchDispatches(
      ctx,
      startMs,
      endMs
    )
    const merged = dispatches

    let totalItems = 0
    let totalValue = 0

    await Promise.all(
      merged.map(async (dispatch) => {
        if (
          dispatch.itemCount !== undefined &&
          dispatch.totalValue !== undefined
        ) {
          totalItems += dispatch.itemCount
          totalValue += dispatch.totalValue
          return
        }
        const items = await ctx.db
          .query("dispatchItems")
          .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
          .collect()

        totalItems += dispatch.itemCount ?? items.length
        totalValue += items.reduce(
          (sum, item) => sum + item.quantityDeducted * item.unitCost,
          0
        )
      })
    )

    const { docs: adjustments, truncated: adjustmentsTruncated } =
      await fetchAdjustments(ctx, startMs, endMs)

    return {
      dispatchCount: merged.length,
      adjustmentCount: adjustments.length,
      totalItems,
      totalValue,
      // The aggregate is a summary, not an export, so a capped read is reported
      // rather than acted on — the client shows it next to the totals.
      truncated: adjustmentsTruncated || truncated,
      // `dispatches` backs the calendar grid, which marks any day with a
      // dispatch. Read via the same helper so the range is issued once per
      // index rather than once per consumer.
      dispatchTimestamps: [...new Set(dispatches.map((d) => d.createdAt!))],
      adjustmentTimestamps: [...new Set(adjustments.map((a) => a.createdAt!))],
    }
  },
})

/**
 * Dispatches-only export backing the simplified Excel (2 sheets) and PDF
 * (compact grouped) downloads.
 *
 * Returns headers and lines in ONE consistent snapshot so the two Excel
 * sheets (or the PDF groups) cannot straddle a write. Reuses the
 * `fetchDispatches` + `fetchItemsByDispatch` fast path, so multi-dispatch
 * exports cost one window range instead of one `by_dispatch` range per
 * dispatch. See P9.
 */
export const exportDispatchReport = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    // `"desc"` so a capped export keeps the newest dispatches rather than the
    // oldest. The files carry a truncation notice, but a truncated export that
    // silently dropped the most recent rows would be actively misleading.
    const { docs: merged, truncated } = await fetchDispatches(
      ctx,
      startMs,
      endMs,
      UNBOUNDED_RANGE_LIMIT,
      "desc"
    )

    const itemsByDispatch = await fetchItemsByDispatch(ctx, merged, {
      startMs,
      endMs,
    })

    const allItems = itemsByDispatch.flat()
    const [productNames, batchCodes, dispatcherNames] = await Promise.all([
      loadProductNames(ctx, [...new Set(allItems.map((i) => i.productId))]),
      loadBatchCodes(ctx, [...new Set(allItems.map((i) => i.batchId))]),
      // One read per *distinct* dispatcher that predates the denormalized
      // `dispatches.userName`, instead of one sequential read per dispatch row.
      loadUsers(ctx, [
        ...new Set(merged.filter((d) => !d.userName).map((d) => d.userId)),
      ]),
    ])

    const dispatches = merged.map((d, index) => {
      const items = itemsByDispatch[index]
      const userName = d.userName ?? dispatcherNames.get(d.userId)?.name ?? ""
      const itemCount = d.itemCount ?? items.length
      const totalQuantity =
        d.totalQuantity ?? items.reduce((sum, i) => sum + i.dispatchQuantity, 0)
      const totalValue =
        d.totalValue ??
        items.reduce((sum, i) => sum + i.quantityDeducted * i.unitCost, 0)
      return {
        _id: d._id,
        date: d.createdAt!,
        orNumber: d.orNumber ?? "",
        customerRef: d.customerReference ?? "",
        dispatchedBy: userName,
        itemCount,
        totalQuantity,
        totalValue,
      }
    })

    const items = merged.flatMap((d, index) => {
      const userName = d.userName ?? dispatcherNames.get(d.userId)?.name ?? ""
      return itemsByDispatch[index].map((item) => ({
        dispatchId: d._id,
        date: d.createdAt!,
        orNumber: d.orNumber ?? "",
        customerRef: d.customerReference ?? "",
        dispatchedBy: userName,
        product: productNames.get(item.productId) ?? "",
        batchCode: batchCodes.get(item.batchId) ?? "",
        dispatchUom: item.dispatchUom,
        dispatchQty: item.dispatchQuantity,
        qtyDeducted: item.quantityDeducted,
        unitCost: item.unitCost,
        lineTotal: item.quantityDeducted * item.unitCost,
      }))
    })

    return {
      dispatches,
      items,
      truncated,
      limit: UNBOUNDED_RANGE_LIMIT,
    }
  },
})
