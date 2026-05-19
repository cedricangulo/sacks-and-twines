import { getAuthUserId } from "@convex-dev/auth/server"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import {
  archiveProductArgs,
  createProductArgs,
  unarchiveProductArgs,
  updateProductArgs,
} from "./validators"

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

    await Promise.all([
      perUserLimit(ctx, "createBatch", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const existing = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", name))
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
      imageStorageId,
      userAgent,
    }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can update products")

    await Promise.all([
      perUserLimit(ctx, "updateBatch", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const existing = await ctx.db.get(productId)
    if (!existing) throw new Error("Product not found")

    const duplicate = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()
    if (duplicate !== null && duplicate._id.toString() !== productId.toString())
      throw new Error("A product with this name already exists")

    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect()

    if (batches.length > 0) {
      if (category !== existing.category)
        throw new Error(
          "Category cannot be changed because this product already has stock records"
        )
      if (baseUom !== existing.baseUom)
        throw new Error(
          "Base unit cannot be changed because this product already has stock records"
        )
    }

    const patch: Record<string, unknown> = {
      name,
      category,
      baseUom,
      weightPerUnit: weightPerUnit ?? (category === "sacks" ? 0 : 20),
      lowStockThreshold: lowStockThreshold ?? 0,
    }

    if (imageStorageId !== undefined) {
      patch.imagePath = imageStorageId
    }

    await ctx.db.patch(productId, patch)

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "product_update",
      description: `Updated product ${existing.name} → ${name}`,
      userAgent,
    })

    return true
  },
})

export const archive = zMutation({
  args: archiveProductArgs,
  handler: async (ctx, { productId, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can archive products")

    await Promise.all([
      perUserLimit(ctx, "archiveProduct", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const product = await ctx.db.get(productId)
    if (!product) throw new Error("Product not found")
    if (product.status === "archived")
      throw new Error("Product is already archived")

    await ctx.db.patch(productId, { status: "archived" })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "product_archive",
      description: `Archived product ${product.name} (${product.skuCode})`,
      userAgent,
    })

    return true
  },
})

export const unarchive = zMutation({
  args: unarchiveProductArgs,
  handler: async (ctx, { productId, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can unarchive products")

    await Promise.all([
      perUserLimit(ctx, "archiveProduct", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const product = await ctx.db.get(productId)
    if (!product) throw new Error("Product not found")
    if (product.status === "active") throw new Error("Product is not archived")

    await ctx.db.patch(productId, { status: "active" })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "product_unarchive",
      description: `Unarchived product ${product.name} (${product.skuCode})`,
      userAgent,
    })

    return true
  },
})
