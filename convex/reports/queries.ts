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

async function loadProducts(
  ctx: QueryCtx,
  ids: Id<"products">[]
): Promise<Map<Id<"products">, Doc<"products">>> {
  const out = new Map<Id<"products">, Doc<"products">>()
  await Promise.all(
    ids.map(async (id) => {
      const doc = await ctx.db.get(id)
      if (doc) out.set(id, doc)
    })
  )
  return out
}

async function loadSuppliers(
  ctx: QueryCtx,
  ids: Id<"suppliers">[]
): Promise<Map<Id<"suppliers">, Doc<"suppliers">>> {
  const out = new Map<Id<"suppliers">, Doc<"suppliers">>()
  await Promise.all(
    ids.map(async (id) => {
      const doc = await ctx.db.get(id)
      if (doc) out.set(id, doc)
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
 * load and the dispatch month range twice more via two different indexes —
 * separate function references, so the shared query cache cannot dedupe them.
 * Folding them together takes `/reports` from 3 invocations to 2.
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

    // Two reads of the same range, each bounded to a different index set:
    // `by_status_createdAt` (completed only) for the totals, and `by_createdAt`
    // (all statuses) for the calendar grid. Reading them together keeps it to
    // two index ranges instead of two calls each doing its own.
    const [allDispatchesRead, completedRead] = await Promise.all([
      fetchDispatches(ctx, startMs, endMs),
      fetchDispatches(ctx, startMs, endMs, "completed"),
    ])
    const allDispatches = allDispatchesRead.docs
    const merged = completedRead.docs

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
      truncated:
        adjustmentsTruncated ||
        allDispatchesRead.truncated ||
        completedRead.truncated,
      // `allDispatches` (unfiltered by status) backs the calendar grid, which
      // marks any day with a dispatch. Read via the same helper so the range is
      // issued once per index rather than once per consumer.
      dispatchTimestamps: [
        ...new Set(allDispatches.map((d) => d.createdAt ?? d._creationTime)),
      ],
      adjustmentTimestamps: [
        ...new Set(adjustments.map((a) => a.createdAt ?? a._creationTime)),
      ],
    }
  },
})

// ---------------------------------------------------------------------------
// CSV export queries
//
// Every query below returns `{ records, truncated, limit }`. The envelope is the
// point: a capped read that reports itself is recoverable, and one that does not
// ships a CSV whose row count is a lie.
// ---------------------------------------------------------------------------

export const exportProducts = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    // Catalog table, so a single `.collect()` stays cheaper than an index range
    // plus a residual pass for rows written before `backfillProductCreatedAt`.
    // The cap is applied after the date filter, so the flag describes the
    // in-range rows the user asked for.
    const allProducts = await ctx.db.query("products").collect()
    const inRange = allProducts.filter((p) => {
      const ts = p.createdAt ?? p._creationTime
      return ts >= startMs && ts <= endMs
    })
    const products = inRange.slice(0, UNBOUNDED_RANGE_LIMIT)
    const truncated = inRange.length > UNBOUNDED_RANGE_LIMIT

    const productsWithSupplier = await Promise.all(
      products.map(async (p) => {
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", p._id))
          .collect()

        const activeBatches = batches.filter((b) => b.status === "active")

        const lastSupplierId =
          activeBatches.length > 0
            ? [...activeBatches].sort(
                (a, b) => b._creationTime - a._creationTime
              )[0].supplierId
            : null

        let lastSupplierName = ""
        if (lastSupplierId) {
          const supplier = await ctx.db.get(lastSupplierId)
          if (supplier) lastSupplierName = supplier.companyName
        }

        return {
          _id: p._id,
          skuCode: p.skuCode,
          name: p.name,
          category: p.category,
          baseUom: p.baseUom,
          status: p.status,
          currentQuantity: p.currentQuantity,
          totalAssetValue: p.totalAssetValue,
          lowStockThreshold: p.lowStockThreshold,
          conversionFactor: p.conversionFactor,
          lastSupplier: lastSupplierName,
          batchCount: activeBatches.length,
        }
      })
    )

    return {
      records: productsWithSupplier,
      truncated,
      limit: UNBOUNDED_RANGE_LIMIT,
    }
  },
})

export const exportBatches = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    // `batches.by_createdAt` bounds this to the requested range; `createdAt` is
    // written by `stockIn` and backfilled by `backfillBatchCreatedAt`.
    const indexed = await ctx.db
      .query("batches")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", startMs).lte("createdAt", endMs)
      )
      .take(UNBOUNDED_RANGE_LIMIT + 1)

    let inRange = indexed
    let truncated = indexed.length > UNBOUNDED_RANGE_LIMIT
    if (truncated) {
      inRange = indexed.slice(0, UNBOUNDED_RANGE_LIMIT)
    } else {
      // Rows written before the backfill are absent from the index. Read them
      // separately rather than letting them vanish from the export.
      const legacy = await ctx.db
        .query("batches")
        .withIndex("by_createdAt", (q) => q.eq("createdAt", undefined))
        .collect()
      const legacyInRange = legacy.filter((b) => {
        const ts = b._creationTime
        return ts >= startMs && ts <= endMs
      })
      inRange = [...inRange, ...legacyInRange]
      if (inRange.length > UNBOUNDED_RANGE_LIMIT) {
        truncated = true
        inRange = inRange.slice(0, UNBOUNDED_RANGE_LIMIT)
      }
    }

    const batches = inRange

    // Three point reads per batch re-read the same handful of products,
    // suppliers and users over and over. Deduplicate first — this drops 3B
    // index ranges to roughly |products| + |suppliers| + |users| + 1.
    const [productMap, supplierMap, userMap] = await Promise.all([
      loadProducts(ctx, [...new Set(batches.map((b) => b.productId))]),
      loadSuppliers(ctx, [...new Set(batches.map((b) => b.supplierId))]),
      loadUsers(ctx, [...new Set(batches.map((b) => b.userId))]),
    ])

    const records = batches.map((b) => {
      const product = productMap.get(b.productId)
      return {
        _id: b._id,
        batchCode: b.batchCode,
        productName: b.productName ?? product?.name ?? "",
        category: product?.category ?? "",
        status: b.status,
        unitCost: b.unitCost,
        totalCost: b.totalProcurementCost,
        qtyReceived: b.quantityReceived,
        qtyRemaining: b.quantityRemaining,
        supplier:
          b.supplierName ?? supplierMap.get(b.supplierId)?.companyName ?? "",
        receivedBy: b.receivedBy ?? userMap.get(b.userId)?.name ?? "",
        createdAt: b.createdAt ?? b._creationTime,
      }
    })

    return { records, truncated, limit: UNBOUNDED_RANGE_LIMIT }
  },
})

export const exportSuppliers = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    // `suppliers` has no `createdAt` field, so `_creationTime` is the only window
    // available and a catalog scan is unavoidable. The cap still applies so a
    // pathological range cannot ship an unbounded CSV.
    const allSuppliers = await ctx.db.query("suppliers").collect()
    const inRange = allSuppliers.filter(
      (s) => s._creationTime >= startMs && s._creationTime <= endMs
    )

    const records = inRange.slice(0, UNBOUNDED_RANGE_LIMIT).map((s) => ({
      _id: s._id,
      companyName: s.companyName,
      status: s.archivedAt ? "archived" : "active",
      contactPerson: s.contactPerson,
      contactNumber: s.contactNumber,
      address: s.address,
      batchCount: s.batchCount ?? 0,
    }))

    return {
      records,
      truncated: inRange.length > UNBOUNDED_RANGE_LIMIT,
      limit: UNBOUNDED_RANGE_LIMIT,
    }
  },
})

export const exportDispatches = query({
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
    // oldest. The CSV carries a truncation notice, but a truncated export that
    // silently dropped the most recent rows would be actively misleading.
    const { docs: merged, truncated } = await fetchDispatches(
      ctx,
      startMs,
      endMs,
      undefined,
      UNBOUNDED_RANGE_LIMIT,
      "desc"
    )

    const dispatcherNames = await loadUsers(ctx, [
      ...new Set(merged.filter((d) => !d.userName).map((d) => d.userId)),
    ])

    const enriched = await Promise.all(
      merged.map(async (d) => {
        const userName = d.userName ?? dispatcherNames.get(d.userId)?.name ?? ""

        let itemCount = d.itemCount ?? 0
        let totalValue = d.totalValue ?? 0
        if (d.totalValue === undefined || itemCount === 0) {
          const items = await ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
            .collect()
          if (items.length > 0) {
            if (itemCount === 0) itemCount = items.length
            totalValue = items.reduce(
              (sum, i) => sum + i.quantityDeducted * i.unitCost,
              0
            )
          }
        }

        return {
          _id: d._id,
          date: d.createdAt ?? d._creationTime,
          status: d.status,
          orNumber: d.orNumber ?? "",
          customerRef: d.customerReference ?? "",
          dispatchedBy: userName,
          itemCount,
          totalValue,
        }
      })
    )

    return {
      records: enriched,
      truncated,
      limit: UNBOUNDED_RANGE_LIMIT,
    }
  },
})

export const exportDispatchItems = query({
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
    // oldest. The CSV carries a truncation notice, but a truncated export that
    // silently dropped the most recent rows would be actively misleading.
    const { docs: merged, truncated } = await fetchDispatches(
      ctx,
      startMs,
      endMs,
      undefined,
      UNBOUNDED_RANGE_LIMIT,
      "desc"
    )

    const rows: Array<{
      date: number
      status: string
      orNumber: string
      customerRef: string
      dispatchedBy: string
      product: string
      batchCode: string
      dispatchUom: string
      dispatchQty: number
      qtyDeducted: number
      unitCost: number
      lineTotal: number
    }> = []

    const itemsByDispatch = await fetchItemsByDispatch(ctx, merged, {
      startMs,
      endMs,
    })

    const allItems = itemsByDispatch.flat()
    const [productNames, batchCodes, dispatcherNames] = await Promise.all([
      loadProductNames(ctx, [...new Set(allItems.map((i) => i.productId))]),
      loadBatchCodes(ctx, [...new Set(allItems.map((i) => i.batchId))]),
      // One read per *distinct* dispatcher that predates the denormalized
      // `dispatches.userName`, instead of one sequential read per dispatch row
      // inside the loop below.
      loadUsers(ctx, [
        ...new Set(merged.filter((d) => !d.userName).map((d) => d.userId)),
      ]),
    ])

    for (const [index, d] of merged.entries()) {
      const userName = d.userName ?? dispatcherNames.get(d.userId)?.name ?? ""

      for (const item of itemsByDispatch[index]) {
        rows.push({
          date: d.createdAt ?? d._creationTime,
          status: d.status,
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
        })
      }
    }

    return {
      records: rows,
      truncated,
      limit: UNBOUNDED_RANGE_LIMIT,
    }
  },
})

export const exportAdjustments = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const { docs: merged, truncated } = await fetchAdjustments(
      ctx,
      startMs,
      endMs
    )

    const enriched = await Promise.all(
      merged.map(async (a) => {
        const [product, batch, user] = await Promise.all([
          ctx.db.get(a.productId),
          ctx.db.get(a.batchId),
          ctx.db.get(a.userId),
        ])
        return {
          _id: a._id,
          date: a.createdAt ?? a._creationTime,
          product: product?.name ?? "",
          status: a.status,
          batchCode: batch?.batchCode ?? "",
          reason: a.reason,
          quantityAdjusted: a.quantityAdjusted,
          adjustedBy: user?.name ?? "",
        }
      })
    )

    return {
      records: enriched,
      truncated,
      limit: UNBOUNDED_RANGE_LIMIT,
    }
  },
})

// ---------------------------------------------------------------------------
// Monthly report composite query (for PDF generation — single client call)
// ---------------------------------------------------------------------------

export const exportMonthlyReport = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    // Independent range reads — run in parallel.
    const [dispatchRead, adjustmentRead] = await Promise.all([
      fetchDispatches(ctx, startMs, endMs),
      fetchAdjustments(ctx, startMs, endMs),
    ])
    const mergedDispatches = dispatchRead.docs
    const mergedAdjustments = adjustmentRead.docs

    let totalItems = 0
    let totalValue = 0
    const dispatchItemsList: Array<{
      productName: string
      productCategory: string
      batchCode: string
      dispatchUom: string
      dispatchQty: number
      qtyDeducted: number
      unitCost: number
      lineTotal: number
      dispatchDate: number
      dispatchStatus: string
      customerRef: string
      dispatchedBy: string
    }> = []

    const itemsByDispatch = await fetchItemsByDispatch(ctx, mergedDispatches, {
      startMs,
      endMs,
    })

    const allItems = itemsByDispatch.flat()
    const [productDocs, batchCodes, dispatcherNames] = await Promise.all([
      loadProducts(ctx, [...new Set(allItems.map((i) => i.productId))]),
      loadBatchCodes(ctx, [...new Set(allItems.map((i) => i.batchId))]),
      // Same dedup as `exportDispatchItems` — see the note there.
      loadUsers(ctx, [
        ...new Set(
          mergedDispatches.filter((d) => !d.userName).map((d) => d.userId)
        ),
      ]),
    ])
    const productNames = new Map(
      [...productDocs].map(([id, p]) => [id, p.name])
    )

    for (const [index, d] of mergedDispatches.entries()) {
      const items = itemsByDispatch[index]
      const userName = d.userName ?? dispatcherNames.get(d.userId)?.name ?? ""

      totalItems += d.itemCount ?? items.length

      for (const item of items) {
        const lineTotal = item.quantityDeducted * item.unitCost
        totalValue += lineTotal

        dispatchItemsList.push({
          productName: productNames.get(item.productId) ?? "",
          productCategory: productDocs.get(item.productId)?.category ?? "",
          batchCode: batchCodes.get(item.batchId) ?? "",
          dispatchUom: item.dispatchUom,
          dispatchQty: item.dispatchQuantity,
          qtyDeducted: item.quantityDeducted,
          unitCost: item.unitCost,
          lineTotal,
          dispatchDate: d.createdAt ?? d._creationTime,
          dispatchStatus: d.status,
          customerRef: d.customerReference ?? "",
          dispatchedBy: userName,
        })
      }
    }

    const adjustmentItemsList = await Promise.all(
      mergedAdjustments.map(async (a) => {
        const [product, batch, user] = await Promise.all([
          ctx.db.get(a.productId),
          ctx.db.get(a.batchId),
          ctx.db.get(a.userId),
        ])
        return {
          _id: a._id,
          date: a.createdAt ?? a._creationTime,
          product: product?.name ?? "",
          productCategory: product?.category ?? "",
          status: a.status,
          batchCode: batch?.batchCode ?? "",
          reason: a.reason,
          quantityAdjusted: a.quantityAdjusted,
          adjustedBy: user?.name ?? "",
        }
      })
    )

    const dispatchesPerDay = new Map<string, number>()
    for (const d of mergedDispatches) {
      const ts = d.createdAt ?? d._creationTime
      const day = new Date(ts).toLocaleDateString("en-CA")
      dispatchesPerDay.set(day, (dispatchesPerDay.get(day) ?? 0) + 1)
    }

    const categoryBreakdown = {
      sacks: 0,
      twines: 0,
    }
    for (const item of dispatchItemsList) {
      if (item.productCategory === "sacks") categoryBreakdown.sacks++
      else if (item.productCategory === "twines") categoryBreakdown.twines++
    }

    const adjustmentsByReason = new Map<string, number>()
    for (const a of mergedAdjustments) {
      adjustmentsByReason.set(
        a.reason,
        (adjustmentsByReason.get(a.reason) ?? 0) + 1
      )
    }

    const products = await ctx.db.query("products").collect()
    const lowStockProducts = products.filter(
      (p) => p.currentQuantity < p.lowStockThreshold && p.status === "active"
    )
    const topProducts = [...products]
      .filter((p) => p.status === "active")
      .sort((a, b) => b.currentQuantity - a.currentQuantity)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        skuCode: p.skuCode,
        currentQuantity: p.currentQuantity,
      }))

    const suppliers = await ctx.db.query("suppliers").collect()

    return {
      dispatchCount: mergedDispatches.length,
      adjustmentCount: mergedAdjustments.length,
      totalItems,
      totalValue,
      // Surfaced so the PDF can state that the figures cover a capped window
      // rather than implying they are the whole history.
      truncated: dispatchRead.truncated || adjustmentRead.truncated,
      limit: UNBOUNDED_RANGE_LIMIT,
      dispatchesPerDay: Object.fromEntries(dispatchesPerDay),
      categoryBreakdown,
      adjustmentsByReason: Object.fromEntries(adjustmentsByReason),
      lowStockProducts: lowStockProducts.map((p) => ({
        name: p.name,
        skuCode: p.skuCode,
        currentQuantity: p.currentQuantity,
        lowStockThreshold: p.lowStockThreshold,
      })),
      topProducts,
      dispatches: dispatchItemsList,
      adjustments: adjustmentItemsList,
      productCount: products.filter((p) => p.status === "active").length,
      supplierCount: suppliers.filter((s) => !s.archivedAt).length,
    }
  },
})
