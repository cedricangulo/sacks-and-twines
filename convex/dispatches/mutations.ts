import { internal } from "../_generated/api"
import { requireActive } from "../auth/guards"
import { DISPATCH_UOM_BY_CATEGORY, INTEGER_UOMS } from "../lib/constants"
import { nextOrNumber } from "../lib/orNumber"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { submitDispatchArgs } from "./validators"

/**
 * Submits a dispatch order, deducting stock from batches using FIFO ordering.
 * Sacks can only be dispatched in whole units.
 * Accessible to any active user (owner or staff).
 *
 * @param customerReference - Optional customer PO/SO reference.
 * @param items - Array of dispatch line items (product, quantity, UOM).
 * @param userAgent - Browser user agent for audit logging.
 * @returns Object containing `dispatchId`, `itemCount`, `totalQuantity`, and `orNumber`.
 */
export const submit = zMutation({
  args: submitDispatchArgs,
  handler: async (ctx, { customerReference, items, userAgent }) => {
    const callerId = await requireActive(ctx)
    const caller = await ctx.db.get(callerId)

    await Promise.all([
      perUserLimit(ctx, "createDispatch", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const timestampMs = Date.now()
    const orNumber = await nextOrNumber(ctx, timestampMs)

    const dispatchId = await ctx.db.insert("dispatches", {
      userId: callerId,
      customerReference: customerReference ?? undefined,
      orNumber,
      status: "completed",
      userName: caller?.name ?? "Unknown",
    })

    let totalDispatchItems = 0
    let totalQuantity = 0
    let totalCostDeducted = 0
    const batchChanges: Record<string, { old: number; new: number }> = {}
    const itemSummaries: string[] = []

    for (const item of items) {
      const product = await ctx.db.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      if (product.status === "archived")
        throw new Error(`Product ${product.name} is archived`)

      // Validate UOM is valid for this product category
      const allowedUoms = DISPATCH_UOM_BY_CATEGORY[product.category]
      if (!(allowedUoms as readonly string[]).includes(item.dispatchUom)) {
        throw new Error(
          `Cannot dispatch ${product.name} by "${item.dispatchUom}" — ${product.category} can only be dispatched as ${allowedUoms.join("/")}`
        )
      }

      if (
        (INTEGER_UOMS as readonly string[]).includes(item.dispatchUom) &&
        !Number.isInteger(item.quantity)
      ) {
        throw new Error(
          `Dispatch UOM "${item.dispatchUom}" requires whole units — ${item.quantity} is not valid for ${product.name}`
        )
      }

      // Convert dispatch quantity to baseUom for batch deduction
      const toDeduct =
        item.dispatchUom === product.baseUom
          ? item.quantity
          : item.quantity * (product.conversionFactor ?? 0)

      if (toDeduct <= 0) {
        throw new Error(
          `Cannot dispatch ${product.name} — missing conversion factor for ${item.dispatchUom} to ${product.baseUom}`
        )
      }

      // Get active batches with remaining stock, FIFO (oldest first)
      const activeBatches = await ctx.db
        .query("batches")
        .withIndex("by_product_status", (q) =>
          q.eq("productId", item.productId).eq("status", "active")
        )
        .order("asc")
        .collect()

      const availableBatches = activeBatches.filter(
        (b) => b.quantityRemaining > 0
      )

      let remaining = toDeduct
      let itemCost = 0

      for (const batch of availableBatches) {
        if (remaining <= 0) break

        const deducted = Math.min(remaining, batch.quantityRemaining)
        const newRemaining = batch.quantityRemaining - deducted

        batchChanges[batch.batchCode] = {
          old: batch.quantityRemaining,
          new: newRemaining,
        }

        // dispatchQuantity in the user's chosen UOM for this batch's portion
        const dispatchQty =
          item.dispatchUom === product.baseUom
            ? deducted
            : deducted / (product.conversionFactor ?? 1)

        await Promise.all([
          ctx.db.insert("dispatchItems", {
            dispatchId,
            batchId: batch._id,
            productId: item.productId,
            dispatchUom: item.dispatchUom,
            dispatchQuantity: dispatchQty,
            quantityDeducted: deducted,
            unitCost: batch.unitCost,
          }),
          ctx.db.patch(batch._id, {
            quantityRemaining: newRemaining,
            status: newRemaining === 0 ? "depleted" : "active",
          }),
        ])

        remaining -= deducted
        totalCostDeducted += deducted * batch.unitCost
        itemCost += deducted * batch.unitCost
        totalDispatchItems++
        totalQuantity += dispatchQty
      }

      itemSummaries.push(
        `${product.name} x ${item.quantity} ${item.dispatchUom} (₱${itemCost.toFixed(2)})`
      )

      // Guard: all requested quantity must be fulfilled
      // 1e-7 is a small epsilon to account for floating-point precision issues
      if (remaining > 1e-7) {
        throw new Error(
          `Insufficient stock for ${product.name} — requested ${item.quantity} ${item.dispatchUom}, only ${(toDeduct - remaining).toFixed(2)} ${product.baseUom} available`
        )
      }

      await ctx.db.patch(item.productId, {
        currentQuantity: Math.max(0, product.currentQuantity - toDeduct),
        totalAssetValue: Math.max(0, product.totalAssetValue - itemCost),
      })
    }

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "dispatch_submit",
      description: JSON.stringify({
        summary: `Dispatched ${items.length} product(s) across ${totalDispatchItems} batch(es)${customerReference ? ` to ${customerReference}` : ""}`,
        details: {
          orNumber,
          customerReference: customerReference ?? "—",
          totalItems: items.length,
          totalBatches: totalDispatchItems,
          totalCost: totalCostDeducted.toFixed(2),
          items: itemSummaries.join("; "),
        },
        changes: batchChanges,
      }),
      resourceType: "dispatch",
      resourceId: dispatchId,
      userAgent,
    })

    await ctx.db.patch(dispatchId, {
      itemCount: totalDispatchItems,
      totalQuantity,
    })

    return {
      dispatchId,
      itemCount: totalDispatchItems,
      totalQuantity,
      orNumber,
    }
  },
})
