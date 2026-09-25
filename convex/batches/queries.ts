import { getAuthUserId } from "@convex-dev/auth/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import { query } from "../_generated/server"

/**
 * Lists all batches for a product, ordered newest-first.
 * @param productId - ID of the product to list batches for.
 */
export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    return await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .order("desc")
      .collect()
  },
})

/**
 * Fetches a single batch with enriched data: product/supplier names,
 * dispatch count, adjustment count, and whether quantities are editable.
 * @param batchId - ID of the batch to fetch.
 */
export const getById = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, { batchId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const batch = await ctx.db.get(batchId)
    if (!batch) return null

    const [product, supplier, dispatchItems, adjustments] = await Promise.all([
      ctx.db.get(batch.productId),
      ctx.db.get(batch.supplierId),
      ctx.db
        .query("dispatchItems")
        .withIndex("by_batch", (q) => q.eq("batchId", batchId))
        .collect(),
      ctx.db
        .query("stockAdjustments")
        .withIndex("by_batch", (q) => q.eq("batchId", batchId))
        .collect(),
    ])

    const dispatchCount = dispatchItems.length
    const activeAdjustmentCount = adjustments.filter(
      (a) => a.status === "applied"
    ).length

    return {
      ...batch,
      productName: product?.name ?? null,
      category: product?.category ?? null,
      baseUom: product?.baseUom ?? null,
      conversionFactor: product?.conversionFactor ?? null,
      lowStockThreshold: product?.lowStockThreshold ?? null,
      imagePath: product?.imagePath ?? null,
      supplierName: supplier?.companyName ?? null,
      dispatchCount,
      activeAdjustmentCount,
      canEditQuantities: dispatchCount === 0 && activeAdjustmentCount === 0,
    }
  },
})

/**
 * Lists active batches with remaining stock for a product, ordered FIFO.
 * Used by the dispatch UI to select which batches to draw from.
 * @param productId - ID of the product to list batches for.
 */
export const listForDispatch = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const activeBatches = await ctx.db
      .query("batches")
      .withIndex("by_product_status", (q) =>
        q.eq("productId", productId).eq("status", "active")
      )
      .order("asc")
      .collect()

    return activeBatches.filter((b) => b.quantityRemaining > 0)
  },
})

/**
 * Cursor-paginated stock-in ("receiving") history within a date range,
 * newest first.
 *
 * Index selection — one filter becomes the index prefix, the other applies to the
 * returned page. Supplier wins when both are set:
 * - `supplierId` → `by_supplier_createdAt`
 * - `status`     → `by_status_createdAt`
 * - none         → `by_createdAt`
 *
 * Putting the leading filter in the index is what makes the page, `isDone` and
 * `continueCursor` describe the *filtered* set. Filtering after pagination
 * strands matches past the cursor — a page can come back empty while rows the
 * user asked for sit one page further on.
 *
 * Covering every combination would mean an index per permutation, so the second
 * filter stays in memory. `continueCursor`/`isDone` then describe the index
 * range rather than the filtered page; the client keeps its pagination controls
 * mounted and reports how many rows the residual filter dropped. See
 * `app/(dashboard)/receiving-history/page.tsx`.
 *
 * There is deliberately no receiver filter. Stock-in is owner-only
 * (`batches.mutations.stockIn` → `requireOwner`) and no mutation can create a
 * second owner — `users.mutations.create` hardcodes `role: "staff"` — so every
 * batch's `userId` is the same seeded owner and the filter could only ever
 * select "everything". It previously cost a `by_userId_createdAt` index on
 * `batches` (its only reader) plus a `users.listNames` subscription on the page.
 * `receivedBy` survives as a display field for the details dialog.
 *
 * Display fields (`productName`, `supplierName`, `receivedBy`) are read from the
 * denormalized columns written by `batches.mutations.stockIn`. For rows written
 * before `backfillBatchDenorm` ran they are absent, so this falls back to the
 * live documents — deduplicated, so the fallback costs at most one read per
 * distinct product/supplier/user on the page rather than one per row.
 *
 * Owner-only access, matching `stockIn`.
 */
export const listHistory = query({
  args: {
    paginationOpts: paginationOptsValidator,
    startMs: v.number(),
    endMs: v.number(),
    supplierId: v.optional(v.id("suppliers")),
    status: v.optional(
      v.union(v.literal("active"), v.literal("depleted"), v.literal("voided"))
    ),
  },
  handler: async (
    ctx,
    { paginationOpts, startMs, endMs, supplierId, status }
  ) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner" || caller.status !== "active")
      throw new Error("Only owners can view receiving history")

    // Exactly one filter becomes the index prefix — supplier first, since a named
    // supplier is the most selective of the two and was the pre-existing
    // behaviour. The other becomes a residual page filter.
    const prefix =
      supplierId !== undefined
        ? "supplier"
        : status !== undefined
          ? "status"
          : "none"

    const result = await (async () => {
      if (prefix === "supplier") {
        return ctx.db
          .query("batches")
          .withIndex("by_supplier_createdAt", (q) =>
            q
              .eq("supplierId", supplierId as Id<"suppliers">)
              .gte("createdAt", startMs)
              .lte("createdAt", endMs)
          )
          .order("desc")
          .paginate(paginationOpts)
      }
      if (prefix === "status") {
        return ctx.db
          .query("batches")
          .withIndex("by_status_createdAt", (q) =>
            q
              .eq("status", status as "active" | "depleted" | "voided")
              .gte("createdAt", startMs)
              .lte("createdAt", endMs)
          )
          .order("desc")
          .paginate(paginationOpts)
      }
      return ctx.db
        .query("batches")
        .withIndex("by_createdAt", (q) =>
          q.gte("createdAt", startMs).lte("createdAt", endMs)
        )
        .order("desc")
        .paginate(paginationOpts)
    })()

    let page = result.page

    // Residual filters — everything the index prefix above did not apply.
    if (prefix !== "status" && status !== undefined) {
      page = page.filter((b) => b.status === status)
    }

    // Only rows missing the denormalized fields need a live read.
    const needsFallback = page.filter(
      (b) =>
        b.productName === undefined ||
        b.productSku === undefined ||
        b.supplierName === undefined ||
        b.receivedBy === undefined
    )

    const fallbackIds = {
      productIds: [
        ...new Set(needsFallback.map((b) => b.productId)),
      ] as Id<"products">[],
      supplierIds: [
        ...new Set(needsFallback.map((b) => b.supplierId)),
      ] as Id<"suppliers">[],
      userIds: [
        ...new Set(needsFallback.map((b) => b.userId)),
      ] as Id<"users">[],
    }

    const [products, supplierNames, userNames] = await Promise.all([
      Promise.all(
        fallbackIds.productIds.map(
          async (id) => [id, await ctx.db.get(id)] as const
        )
      ).then(Object.fromEntries),
      Promise.all(
        fallbackIds.supplierIds.map(
          async (id) => [id, (await ctx.db.get(id))?.companyName] as const
        )
      ).then(Object.fromEntries),
      Promise.all(
        fallbackIds.userIds.map(
          async (id) => [id, (await ctx.db.get(id))?.name] as const
        )
      ).then(Object.fromEntries),
    ])

    return {
      ...result,
      page: page.map((b) => {
        const product = products[b.productId]
        return {
          ...b,
          productName: b.productName ?? product?.name ?? "Unknown",
          productSku: b.productSku ?? product?.skuCode ?? "—",
          supplierName:
            b.supplierName ?? supplierNames[b.supplierId] ?? "Unknown",
          receivedBy: b.receivedBy ?? userNames[b.userId] ?? "Unknown",
        }
      }),
    }
  },
})
