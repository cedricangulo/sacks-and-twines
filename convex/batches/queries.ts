import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Lists all batches for a product, ordered newest-first.
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
      weightPerUnit: product?.weightPerUnit ?? null,
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
 * Returns the total number of batches for a given product.
 */
export const getCountByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect()

    return batches.length
  },
})

/**
 * Lists active batches with remaining stock for a product, ordered FIFO.
 * Used by the dispatch UI to select which batches to draw from.
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
