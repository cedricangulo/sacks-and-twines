import { internal } from "../_generated/api"
import { Doc } from "../_generated/dataModel"
import { requireOwner } from "../auth/guards"
import { DEFAULT_CONVERSION_FACTOR } from "../lib/constants"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { stockInArgs, updateBatchArgs, voidBatchArgs } from "./validators"

/**
 * Generates a pre-signed upload URL for product images.
 * Only active owners may generate upload URLs.
 */
export const generateUploadUrl = zMutation({
  args: {},
  handler: async (ctx) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "generateUploadUrl", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Stocks inventory in by creating a new batch. Supports two modes:
 * - "existing": adds stock to an existing product.
 * - "new": creates a product and its first batch simultaneously.
 * Only active owners may stock in.
 *
 * @param mode - Whether to use an existing product or create a new one.
 * @param productId - Product ID (required for "existing" mode).
 * @param name - Product name (required for "new" mode).
 * @param category - Product category (required for "new" mode).
 * @param baseUom - Base unit (required for "new" mode).
 * @param conversionFactor - Conversion factor for UOM conversions.
 * @param supplierId - Supplier for this batch.
 * @param quantityReceived - Received quantity.
 * @param totalProcurementCost - Total cost of procurement.
 * @param lowStockThreshold - Low-stock alert threshold for new products.
 * @param imageStorageId - Storage ID for product image (new products only).
 * @param userAgent - Browser user agent for audit logging.
 * @returns Object containing `productId` and `batchCode`.
 */
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
      conversionFactor,
      supplierId,
      quantityReceived,
      totalProcurementCost,
      lowStockThreshold,
      imageStorageId,
      userAgent,
    }
  ) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "createBatch", callerId),
      globalLimit(ctx, "globalCreateSupplier"),
    ])

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
        throw new Error(
          "Name, category, and base UOM are required for new products"
        )

      const duplicate = await ctx.db
        .query("products")
        .withIndex("by_name", (q) => q.eq("name", name))
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
          throw new Error(
            "Failed to generate unique SKU code after 20 attempts"
          )
      }

      resolvedProductId = await ctx.db.insert("products", {
        skuCode,
        name,
        category,
        baseUom,
        conversionFactor:
          conversionFactor ?? DEFAULT_CONVERSION_FACTOR[category],
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: lowStockThreshold ?? 0,
        status: "active",
        imagePath: imageStorageId,
      })
    }

    const product = await ctx.db.get(resolvedProductId)

    const unitCost = totalProcurementCost / quantityReceived
    const bDate = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    let batchCode = ""
    for (let i = 0; i < 20; i++) {
      const random = Math.floor(Math.random() * 9000 + 1000).toString()
      batchCode = `BAT-${bDate}-${random}`
      const existing = await ctx.db
        .query("batches")
        .withIndex("by_batchCode", (q) => q.eq("batchCode", batchCode))
        .first()
      if (existing === null) break
      if (i === 19)
        throw new Error(
          "Failed to generate unique batch code after 20 attempts"
        )
    }

    const batchId = await ctx.db.insert("batches", {
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

    // Increment supplier batchCount
    const supplierDoc = await ctx.db.get(supplierId)
    if (supplierDoc) {
      await ctx.db.patch(supplierId, {
        batchCount: (supplierDoc.batchCount ?? 0) + 1,
      })
    }

    if (product) {
      const patch: Partial<Doc<"products">> = {
        currentQuantity: product.currentQuantity + quantityReceived,
        totalAssetValue: product.totalAssetValue + totalProcurementCost,
      }
      if (imageStorageId) {
        patch.imagePath = imageStorageId
      }
      await ctx.db.patch(resolvedProductId, patch)
    }

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "stock_in",
      description: JSON.stringify({
        summary:
          mode === "existing"
            ? `Stocked in ${quantityReceived} units of ${product?.name} (${batchCode})`
            : `Created product ${name} and stocked in ${quantityReceived} units (${batchCode})`,
        details: {
          product: mode === "existing" ? (product?.name ?? "—") : (name ?? "—"),
          batchCode,
          quantity: quantityReceived,
          supplier: supplierDoc?.companyName ?? "—",
          totalCost: totalProcurementCost,
          unitCost,
        },
      }),
      resourceType: "batch",
      resourceId: batchId,
      userAgent,
    })

    return { productId: resolvedProductId, batchCode }
  },
})

/**
 * Updates an existing batch. Blocks quantity/cost changes if the batch
 * already has dispatch or adjustment history. Adjusts product totals
 * when quantity or cost changes on a clean batch.
 * Only active owners may update batches.
 *
 * @param batchId - ID of the batch to update.
 * @param productId - Associated product ID.
 * @param supplierId - Updated supplier ID.
 * @param quantityReceived - Updated received quantity.
 * @param totalProcurementCost - Updated total cost.
 * @param category - Updated product category.
 * @param baseUom - Updated product base unit.
 * @param conversionFactor - Updated conversion factor.
 * @param lowStockThreshold - Updated low-stock threshold.
 * @param userAgent - Browser user agent for audit logging.
 * @returns `true` on success.
 */
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
      conversionFactor,
      lowStockThreshold,
      userAgent,
    }
  ) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "updateBatch", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const batch = await ctx.db.get(batchId)
    if (!batch) throw new Error("Batch not found")
    if (batch.status === "voided")
      throw new Error("Cannot update a voided batch")

    const changes: Record<string, { old: unknown; new: unknown }> = {}

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

    const hasHistory =
      dispatchItems.length > 0 ||
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

      if (batch.supplierId.toString() !== supplierId.toString()) {
        const [oldSupplierDoc, newSupplierDoc] = await Promise.all([
          ctx.db.get(batch.supplierId),
          ctx.db.get(supplierId),
        ])
        changes.supplier_name = {
          old: oldSupplierDoc?.companyName,
          new: newSupplierDoc?.companyName,
        }
        await Promise.all([
          oldSupplierDoc?.batchCount !== undefined
            ? ctx.db.patch(batch.supplierId, {
                batchCount: oldSupplierDoc.batchCount - 1,
              })
            : Promise.resolve(),
          newSupplierDoc?.batchCount !== undefined
            ? ctx.db.patch(supplierId, {
                batchCount: newSupplierDoc.batchCount + 1,
              })
            : Promise.resolve(),
        ])
      }
    } else {
      const unitCost = totalProcurementCost / quantityReceived
      const oldQty = batch.quantityReceived
      const oldCost = batch.totalProcurementCost
      const qtyDelta = quantityReceived - oldQty
      const costDelta = totalProcurementCost - oldCost

      if (oldQty !== quantityReceived) {
        changes.qty_received = { old: oldQty, new: quantityReceived }
        changes.qty_remaining = {
          old: batch.quantityRemaining,
          new: batch.quantityRemaining + qtyDelta,
        }
      }
      if (oldCost !== totalProcurementCost) {
        changes.total_cost = { old: oldCost, new: totalProcurementCost }
      }
      if (unitCost !== batch.unitCost) {
        changes.unit_cost = { old: batch.unitCost, new: unitCost }
      }

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
                conversionFactor:
                  conversionFactor ?? DEFAULT_CONVERSION_FACTOR[category],
              }
            : {}),
          ...(baseUom !== undefined ? { baseUom } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
        })
      }

      if (batch.supplierId.toString() !== supplierId.toString()) {
        const [oldSupplierDoc, newSupplierDoc] = await Promise.all([
          ctx.db.get(batch.supplierId),
          ctx.db.get(supplierId),
        ])
        changes.supplier_name = {
          old: oldSupplierDoc?.companyName,
          new: newSupplierDoc?.companyName,
        }
        await Promise.all([
          oldSupplierDoc?.batchCount !== undefined
            ? ctx.db.patch(batch.supplierId, {
                batchCount: oldSupplierDoc.batchCount - 1,
              })
            : Promise.resolve(),
          newSupplierDoc?.batchCount !== undefined
            ? ctx.db.patch(supplierId, {
                batchCount: newSupplierDoc.batchCount + 1,
              })
            : Promise.resolve(),
        ])
      }
    }

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "batch_update",
      description: JSON.stringify({
        summary: `Updated batch ${batch.batchCode}`,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      }),
      resourceType: "batch",
      resourceId: batchId,
      userAgent,
    })

    return true
  },
})

/**
 * Voids an active batch, reversing its quantity and cost from the
 * associated product. Also voids any applied stock adjustments for this batch.
 * Cannot void a batch that has been used in dispatches.
 * Only active owners may void batches.
 *
 * @param batchId - ID of the batch to void.
 * @param reason - Optional reason for voiding.
 * @param userAgent - Browser user agent for audit logging.
 * @returns Object containing the count of voided adjustments.
 */
export const voidBatch = zMutation({
  args: voidBatchArgs,
  handler: async (ctx, { batchId, reason, userAgent }) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "voidBatch", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const batch = await ctx.db.get(batchId)
    if (!batch) throw new Error("Batch not found")
    if (batch.status !== "active")
      throw new Error("Only active batches can be voided")

    const dispatchItems = await ctx.db
      .query("dispatchItems")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect()
    if (dispatchItems.length > 0) {
      throw new Error("Cannot void a batch that has been used in dispatches")
    }

    await ctx.db.patch(batchId, { status: "voided" })

    const product = await ctx.db.get(batch.productId)
    if (product) {
      await ctx.db.patch(batch.productId, {
        currentQuantity: Math.max(
          0,
          product.currentQuantity - batch.quantityRemaining
        ),
        totalAssetValue: Math.max(
          0,
          product.totalAssetValue - batch.quantityRemaining * batch.unitCost
        ),
      })
    }

    const adjustments = await ctx.db
      .query("stockAdjustments")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect()
    const voidedAdjustments = adjustments.filter(
      (adj) => adj.status === "applied"
    )
    await Promise.all(
      voidedAdjustments.map((adj) =>
        ctx.db.patch(adj._id, { status: "voided" })
      )
    )
    const voidedCount = voidedAdjustments.length

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "batch_void",
      description: JSON.stringify({
        summary: `Voided batch ${batch.batchCode} — removed ${batch.quantityRemaining} units from ${product?.name ?? "product"}`,
        details: {
          batchCode: batch.batchCode,
          product: product?.name ?? "—",
          unitsRemoved: batch.quantityRemaining,
          costRemoved: batch.totalProcurementCost,
          voidedAdjustments: voidedCount,
          reason: reason ?? "—",
        },
      }),
      resourceType: "batch",
      resourceId: batchId,
      userAgent,
    })

    return { voidedAdjustments: voidedCount }
  },
})
