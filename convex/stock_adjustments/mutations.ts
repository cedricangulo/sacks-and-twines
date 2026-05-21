import { getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "../_generated/api"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { createStockAdjustmentArgs } from "./validators"

export const create = zMutation({
  args: createStockAdjustmentArgs,
  handler: async (
    ctx,
    { batchId, productId, direction, quantity, reason, userAgent }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner" || caller.status !== "active")
      throw new Error("Only owners can adjust stock")

    await Promise.all([
      perUserLimit(ctx, "createStockAdjustment", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const [batch, product] = await Promise.all([
      ctx.db.get(batchId),
      ctx.db.get(productId),
    ])

    if (!batch) throw new Error("Batch not found")
    if (batch.status !== "active")
      throw new Error("Cannot adjust stock on a non-active batch")

    if (!product) throw new Error("Product not found")
    if (product.status !== "active")
      throw new Error("Cannot adjust stock on an archived product")

    const quantityAdjusted = direction === "add" ? quantity : -quantity
    const costDelta = quantityAdjusted * batch.unitCost

    await ctx.db.insert("stockAdjustments", {
      batchId,
      productId,
      userId: callerId,
      quantityAdjusted,
      reason,
      status: "applied",
    })

    const newRemaining = Math.max(0, batch.quantityRemaining + quantityAdjusted)
    const patch: Record<string, unknown> = { quantityRemaining: newRemaining }
    if (newRemaining === 0) {
      patch.status = "depleted"
    }
    await Promise.all([
      ctx.db.patch(batchId, patch),
      ctx.db.patch(productId, {
        currentQuantity: Math.max(
          0,
          product.currentQuantity + quantityAdjusted
        ),
        totalAssetValue: Math.max(0, product.totalAssetValue + costDelta),
      }),
      ctx.runMutation(internal.auditLogs.mutations.log, {
        userId: callerId,
        action: "stock_adjustment",
        description: JSON.stringify({
          summary: `Stock ${direction === "add" ? "added to" : "deducted from"} ${product.name} (${reason})`,
          details: {
            batchCode: batch.batchCode,
            productName: product.name,
            quantityAdjusted,
            reason,
            direction,
          },
          changes: {
            qty_remaining: {
              old: batch.quantityRemaining,
              new: newRemaining,
            },
          },
        }),
        resourceType: "batch",
        resourceId: batchId,
        userAgent,
      }),
    ])

    return true
  },
})
