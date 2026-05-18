import { getAuthUserId } from "@convex-dev/auth/server"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { submitDispatchArgs } from "./validators"

export const submit = zMutation({
  args: submitDispatchArgs,
  handler: async (ctx, { customerReference, items, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    await perUserLimit(ctx, "createDispatch", callerId)
    await globalLimit(ctx, "globalMutations")

    const dispatchId = await ctx.db.insert("dispatches", {
      userId: callerId,
      customerReference: customerReference ?? undefined,
      status: "completed",
    })

    let totalDispatchItems = 0

    for (const item of items) {
      const product = await ctx.db.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      if (product.status === "archived")
        throw new Error(`Product ${product.name} is archived`)

      if (product.category === "sacks" && !Number.isInteger(item.quantity)) {
        throw new Error(
          `Sacks can only be dispatched in whole units — ${item.quantity} is not valid for ${product.name}`
        )
      }

      // Convert dispatch quantity to baseUom for batch deduction
      let toDeduct: number
      if (item.dispatchUom === "kilo") {
        if (!product.weightPerUnit || product.weightPerUnit <= 0) {
          throw new Error(
            `Product ${product.name} has no weight-per-unit configured for kg dispatch`
          )
        }
        toDeduct = item.quantity / product.weightPerUnit
      } else {
        toDeduct = item.quantity
      }

      // Get active batches with remaining stock, FIFO (oldest first)
      const batches = await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", item.productId))
        .order("asc")
        .collect()

      const activeBatches = batches.filter(
        (b) => b.status === "active" && b.quantityRemaining > 0
      )

      let remaining = toDeduct
      let totalCostDeducted = 0

      for (const batch of activeBatches) {
        if (remaining <= 0) break

        const deducted = Math.min(remaining, batch.quantityRemaining)
        const newRemaining = batch.quantityRemaining - deducted

        // dispatchQuantity in the user's chosen UOM for this batch's portion
        let dispatchQty: number
        if (item.dispatchUom === "kilo") {
          dispatchQty = deducted * product.weightPerUnit!
        } else {
          dispatchQty = deducted
        }

        await ctx.db.insert("dispatchItems", {
          dispatchId,
          batchId: batch._id,
          productId: item.productId,
          dispatchUom: item.dispatchUom,
          dispatchQuantity: dispatchQty,
          quantityDeducted: deducted,
          unitCost: batch.unitCost,
        })

        await ctx.db.patch(batch._id, {
          quantityRemaining: newRemaining,
          status: newRemaining === 0 ? "depleted" : "active",
        })

        remaining -= deducted
        totalCostDeducted += deducted * batch.unitCost
        totalDispatchItems++
      }

      // Guard: all requested quantity must be fulfilled
      if (remaining > 0) {
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

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "dispatch_submit",
      description: `Dispatched ${items.length} product(s) across ${totalDispatchItems} batch(es)`,
      userAgent,
    })

    return { dispatchId, itemCount: totalDispatchItems }
  },
})
