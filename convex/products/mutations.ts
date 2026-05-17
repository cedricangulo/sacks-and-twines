import { getAuthUserId } from "@convex-dev/auth/server"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { createProductArgs, updateProductArgs } from "./validators"

export const create = zMutation({
  args: createProductArgs,
  handler: async (
    ctx,
    { name, category, baseUom, weightPerUnit, lowStockThreshold, userAgent }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can create products")

    await perUserLimit(ctx, "createBatch", callerId)
    await globalLimit(ctx, "globalMutations")

    const existing = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("name"), name))
      .first()
    if (existing !== null)
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

    const productId = await ctx.db.insert("products", {
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

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "product_create",
      description: `Created product ${name} (${skuCode})`,
      userAgent,
    })

    return productId
  },
})

export const update = zMutation({
  args: updateProductArgs,
  handler: async (
    ctx,
    {
      productId,
      name,
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
      throw new Error("Only owners can update products")

    await perUserLimit(ctx, "updateBatch", callerId)
    await globalLimit(ctx, "globalMutations")

    const existing = await ctx.db.get(productId)
    if (!existing) throw new Error("Product not found")

    const duplicate = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("name"), name))
      .first()
    if (duplicate !== null && duplicate._id.toString() !== productId.toString())
      throw new Error("A product with this name already exists")

    await ctx.db.patch(productId, {
      name,
      category,
      baseUom,
      weightPerUnit: weightPerUnit ?? (category === "sacks" ? 0 : 20),
      lowStockThreshold: lowStockThreshold ?? 0,
    })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "product_update",
      description: `Updated product ${existing.name} → ${name}`,
      userAgent,
    })

    return true
  },
})
