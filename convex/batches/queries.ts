import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

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

export const getById = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, { batchId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const batch = await ctx.db.get(batchId)
    if (!batch) return null

    const [product, supplier] = await Promise.all([
      ctx.db.get(batch.productId),
      ctx.db.get(batch.supplierId),
    ])

    const [dispatchItems, adjustments] = await Promise.all([
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

export const listForDispatch = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .order("asc")
      .collect()

    return batches.filter(
      (b) => b.status === "active" && b.quantityRemaining > 0
    )
  },
})
