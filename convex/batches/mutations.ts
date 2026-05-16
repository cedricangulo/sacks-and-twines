import { getAuthUserId } from "@convex-dev/auth/server"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { stockInArgs, updateBatchArgs, voidBatchArgs } from "./validators"

export const stockIn = zMutation({
  args: stockInArgs,
  handler: async (
    ctx,
    {
      mode,
      productId,
      name,
      category,
      baseUom,
      weightPerUnit,
      supplierId,
      quantityReceived,
      totalProcurementCost,
      lowStockThreshold,
      userAgent,
    }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can stock in")

    await perUserLimit(ctx, "createBatch", callerId)
    await globalLimit(ctx, "globalCreateSupplier")

    let resolvedProductId = productId

    if (mode === "existing") {
      if (!resolvedProductId)
        throw new Error("Product ID is required for existing mode")

      const product = await ctx.db.get(resolvedProductId)
      if (!product) throw new Error("Product not found")
      if (product.status === "archived")
        throw new Error("Cannot stock into an archived product")
    } else {
      if (!name || !category || !baseUom)
        throw new Error("Name, category, and base UOM are required for new products")

      const duplicate = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("name"), name))
        .first()
      if (duplicate !== null)
        throw new Error("A product with this name already exists")

      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      let skuCode = ""
      for (let i = 0; i < 20; i++) {
        const random = Math.floor(Math.random() * 9000 + 1000).toString()
        skuCode = `SKU-${date}-${random}`
        const existing = await ctx.db
          .query("products")
          .withIndex("by_sku", (q) => q.eq("skuCode", skuCode))
          .unique()
        if (existing === null) break
        if (i === 19)
          throw new Error("Failed to generate unique SKU code after 20 attempts")
      }

      resolvedProductId = await ctx.db.insert("products", {
        skuCode,
        name,
        category,
        baseUom,
        weightPerUnit: weightPerUnit ?? (category === "sacks" ? 0 : 20),
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: lowStockThreshold ?? 0,
        status: "active",
      })
    }

    const unitCost = totalProcurementCost / quantityReceived
    const bDate = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    let batchCode = ""
    for (let i = 0; i < 20; i++) {
      const random = Math.floor(Math.random() * 9000 + 1000).toString()
      batchCode = `BAT-${bDate}-${random}`
      const existing = await ctx.db
        .query("batches")
        .filter((q) => q.eq(q.field("batchCode"), batchCode))
        .first()
      if (existing === null) break
      if (i === 19)
        throw new Error("Failed to generate unique batch code after 20 attempts")
    }

    await ctx.db.insert("batches", {
      productId: resolvedProductId,
      supplierId,
      userId: callerId,
      batchCode,
      totalProcurementCost,
      unitCost,
      quantityReceived,
      quantityRemaining: quantityReceived,
      status: "active",
    })

    const product = await ctx.db.get(resolvedProductId)
    if (product) {
      await ctx.db.patch(resolvedProductId, {
        currentQuantity: product.currentQuantity + quantityReceived,
        totalAssetValue: product.totalAssetValue + totalProcurementCost,
      })
    }

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "stock_in",
      description: mode === "existing"
        ? `Stocked in ${quantityReceived} units (${batchCode}) into existing product`
        : `Created product ${name} and stocked in ${quantityReceived} units (${batchCode})`,
      userAgent,
    })

    return { productId: resolvedProductId, batchCode }
  },
})

export const update = zMutation({
  args: updateBatchArgs,
  handler: async (
    ctx,
    {
      batchId,
      productId,
      supplierId,
      quantityReceived,
      totalProcurementCost,
      category,
      baseUom,
      weightPerUnit,
      lowStockThreshold,
      userAgent,
    }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can update batches")

    await perUserLimit(ctx, "updateBatch", callerId)
    await globalLimit(ctx, "globalMutations")

    const batch = await ctx.db.get(batchId)
    if (!batch) throw new Error("Batch not found")
    if (batch.status === "voided")
      throw new Error("Cannot update a voided batch")

    const [dispatchItems, adjustments] = await Promise.all([
      ctx.db
        .query("dispatchItems")
        .filter((q) => q.eq(q.field("batchId"), batchId))
        .collect(),
      ctx.db
        .query("stockAdjustments")
        .filter((q) => q.eq(q.field("batchId"), batchId))
        .collect(),
    ])

    const hasHistory = dispatchItems.length > 0 ||
      adjustments.some((a) => a.status === "applied")

    if (hasHistory) {
      const qtyChanged = quantityReceived !== batch.quantityReceived
      const costChanged = totalProcurementCost !== batch.totalProcurementCost

      if (qtyChanged || costChanged) {
        throw new Error(
          "Cannot change quantity or cost — this batch already has dispatch or adjustment history"
        )
      }

      await ctx.db.patch(batchId, { supplierId })
    } else {
      const unitCost = totalProcurementCost / quantityReceived
      const oldQty = batch.quantityReceived
      const oldCost = batch.totalProcurementCost
      const qtyDelta = quantityReceived - oldQty
      const costDelta = totalProcurementCost - oldCost

      await ctx.db.patch(batchId, {
        supplierId,
        quantityReceived,
        quantityRemaining: batch.quantityRemaining + qtyDelta,
        totalProcurementCost,
        unitCost,
      })

      const product = await ctx.db.get(productId)
      if (product) {
        await ctx.db.patch(productId, {
          currentQuantity: Math.max(0, product.currentQuantity + qtyDelta),
          totalAssetValue: Math.max(0, product.totalAssetValue + costDelta),
          ...(category !== undefined
            ? {
                category,
                weightPerUnit:
                  weightPerUnit ??
                  (category === "sacks" ? 0 : 20),
              }
            : {}),
          ...(baseUom !== undefined ? { baseUom } : {}),
          ...(lowStockThreshold !== undefined
            ? { lowStockThreshold }
            : {}),
        })
      }
    }

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "batch_update",
      description: `Updated batch ${batch.batchCode}`,
      userAgent,
    })

    return true
  },
})

export const voidBatch = zMutation({
  args: voidBatchArgs,
  handler: async (ctx, { batchId, reason, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can void batches")

    await perUserLimit(ctx, "voidBatch", callerId)
    await globalLimit(ctx, "globalMutations")

    const batch = await ctx.db.get(batchId)
    if (!batch) throw new Error("Batch not found")
    if (batch.status !== "active")
      throw new Error("Only active batches can be voided")

    const dispatchItems = await ctx.db
      .query("dispatchItems")
      .filter((q) => q.eq(q.field("batchId"), batchId))
      .collect()
    if (dispatchItems.length > 0) {
      throw new Error("Cannot void a batch that has been used in dispatches")
    }

    await ctx.db.patch(batchId, { status: "voided" })

    const product = await ctx.db.get(batch.productId)
    if (product) {
      await ctx.db.patch(batch.productId, {
        currentQuantity: Math.max(0, product.currentQuantity - batch.quantityRemaining),
        totalAssetValue: Math.max(0, product.totalAssetValue - batch.totalProcurementCost),
      })
    }

    const adjustments = await ctx.db
      .query("stockAdjustments")
      .filter((q) => q.eq(q.field("batchId"), batchId))
      .collect()
    let voidedCount = 0
    for (const adj of adjustments) {
      if (adj.status === "applied") {
        await ctx.db.patch(adj._id, { status: "voided" })
        voidedCount++
      }
    }

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "batch_void",
      description: [
        `Voided batch ${batch.batchCode}`,
        `Removed ${batch.quantityRemaining} units from ${product?.name ?? "product"}`,
        reason ? `Reason: ${reason}` : null,
      ]
        .filter(Boolean)
        .join(". "),
      userAgent,
    })

    return { voidedAdjustments: voidedCount }
  },
})


