import { getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "../_generated/api"
import { INTEGER_UOMS } from "../lib/constants"
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
 * @returns Object containing `dispatchId` and `itemCount`.
 */
export const submit = zMutation({
  args: submitDispatchArgs,
  handler: async (ctx, { customerReference, items, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.status !== "active")
      throw new Error("Account deactivated")

    await Promise.all([
      perUserLimit(ctx, "createDispatch", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const dispatchId = await ctx.db.insert("dispatches", {
      userId: callerId,
      customerReference: customerReference ?? undefined,
      status: "completed",
      userName: caller?.name ?? "Unknown",
    })

    let totalDispatchItems = 0
    let totalCostDeducted = 0
    const batchChanges: Record<string, { old: number; new: number }> = {}
    const itemSummaries: string[] = []

    for (const item of items) {
      const product = await ctx.db.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      if (product.status === "archived")
        throw new Error(`Product ${product.name} is archived`)

      if (
        (INTEGER_UOMS as readonly string[]).includes(item.dispatchUom) &&
        !Number.isInteger(item.quantity)
      ) {
        throw new Error(
          `Dispatch UOM "${item.dispatchUom}" requires whole units — ${item.quantity} is not valid for ${product.name}`
        )
      }

      // Convert dispatch quantity to baseUom for batch deduction
      const toDeduct = item.quantity

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
        const dispatchQty = deducted

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
        totalAssetValue: Math.max(
          0,
          product.totalAssetValue - totalCostDeducted
        ),
      })
    }

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "dispatch_submit",
      description: JSON.stringify({
        summary: `Dispatched ${items.length} product(s) across ${totalDispatchItems} batch(es)${customerReference ? ` to ${customerReference}` : ""}`,
        details: {
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

    await ctx.db.patch(dispatchId, { itemCount: totalDispatchItems })

    return { dispatchId, itemCount: totalDispatchItems }
  },
})
