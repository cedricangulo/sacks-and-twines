import { internal } from "../_generated/api"
import { Doc } from "../_generated/dataModel"
import { requireOwner } from "../auth/guards"
import { DEFAULT_CONVERSION_FACTOR } from "../lib/constants"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { normalizeKeywords } from "../validators/helpers"
import {
  archiveProductArgs,
  createProductArgs,
  unarchiveProductArgs,
  updateProductArgs,
} from "./validators"

/**
 * Creates a new product with a unique SKU and logs the creation.
 * Only active owners may create products.
 *
 * @param name - Product display name.
 * @param category - "sacks", "twines", or "thread".
 * @param baseUom - Base unit of measure ("piece", "roll", or "meter").
 * @param conversionFactor - Conversion factor for UOM conversions (optional).
 * @param lowStockThreshold - Quantity threshold for low-stock alerts (optional).
 * @param userAgent - Browser user agent for audit logging.
 * @returns The newly created product ID (`Id<"products">`).
 */
export const create = zMutation({
  args: createProductArgs,
  handler: async (
    ctx,
    {
      name,
      category,
      baseUom,
      conversionFactor,
      lowStockThreshold,
      keywords,
      userAgent,
    }
  ) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([perUserLimit(ctx, "createBatch", callerId)])

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

    const normalizedKeywords = normalizeKeywords(keywords)

    const productId = await ctx.db.insert("products", {
      skuCode,
      name,
      category,
      baseUom,
      conversionFactor: conversionFactor ?? DEFAULT_CONVERSION_FACTOR[category],
      currentQuantity: 0,
      totalAssetValue: 0,
      lowStockThreshold: lowStockThreshold ?? 0,
      status: "active",
      ...(normalizedKeywords ? { keywords: normalizedKeywords } : {}),
    })

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "product_create",
      description: `Created product ${name} (${skuCode})`,
      resourceType: "product",
      resourceId: productId,
      userAgent,
    })

    return productId
  },
})

/**
 * Updates an existing product. Blocks category/baseUom changes if the
 * product already has stock records (batches).
 * Only active owners may update products.
 *
 * @param productId - ID of the product to update.
 * @param name - New display name.
 * @param category - New category ("sacks", "twines", or "thread").
 * @param baseUom - New base unit ("piece", "roll", or "meter").
 * @param conversionFactor - Updated conversion factor.
 * @param lowStockThreshold - Updated low-stock threshold.
 * @param imageStorageId - New image storage ID (or null to clear).
 * @param userAgent - Browser user agent for audit logging.
 * @returns `true` on success.
 */
export const update = zMutation({
  args: updateProductArgs,
  handler: async (
    ctx,
    {
      productId,
      name,
      category,
      baseUom,
      conversionFactor,
      lowStockThreshold,
      keywords,
      imageStorageId,
      userAgent,
    }
  ) => {
    const callerId = await requireOwner(ctx)

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

    const batch = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .first()

    if (batch !== null) {
      if (category !== existing.category)
        throw new Error(
          "Category cannot be changed because this product already has stock records"
        )
      if (baseUom !== existing.baseUom)
        throw new Error(
          "Base unit cannot be changed because this product already has stock records"
        )
    }

    const normalizedKeywords = normalizeKeywords(keywords)

    const patch: Partial<Doc<"products">> = {
      name,
      category,
      baseUom,
      conversionFactor: conversionFactor ?? DEFAULT_CONVERSION_FACTOR[category],
      lowStockThreshold: lowStockThreshold ?? 0,
    }

    if (keywords !== undefined) {
      patch.keywords = normalizedKeywords
    }

    if (imageStorageId != null) {
      patch.imagePath = imageStorageId
    }

    await ctx.db.patch(productId, patch)

    const changes: Record<string, { old: unknown; new: unknown }> = {}
    if (name !== existing.name) changes.name = { old: existing.name, new: name }
    if (
      conversionFactor !== undefined &&
      conversionFactor !== existing.conversionFactor
    ) {
      changes.conversion_factor = {
        old: existing.conversionFactor,
        new: conversionFactor,
      }
    }
    if (
      lowStockThreshold !== undefined &&
      lowStockThreshold !== existing.lowStockThreshold
    ) {
      changes.low_stock_threshold = {
        old: existing.lowStockThreshold,
        new: lowStockThreshold,
      }
    }
    if (imageStorageId !== undefined && imageStorageId !== existing.imagePath) {
      changes.image = {
        old: existing.imagePath ?? "none",
        new: imageStorageId,
      }
    }
    if (keywords !== undefined) {
      const oldKeywords =
        normalizeKeywords(existing.keywords as string[] | undefined) ?? []
      const newKeywords = normalizedKeywords ?? []
      const unchanged =
        oldKeywords.length === newKeywords.length &&
        oldKeywords.every((keyword, i) => keyword === newKeywords[i])
      if (!unchanged) {
        changes.keywords = { old: oldKeywords, new: newKeywords }
      }
    }

    const changeLabels: Record<string, string> = {
      name: "name",
      conversion_factor: "conversion factor",
      low_stock_threshold: "low stock threshold",
      image: "image",
      keywords: "keywords",
    }
    const changedFields = Object.keys(changes).map(
      (key) => changeLabels[key] ?? key
    )

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "product_update",
      description: JSON.stringify({
        summary:
          changedFields.length > 0
            ? `Updated ${existing.name} — ${changedFields.join(", ")}`
            : `Updated ${existing.name}`,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      }),
      resourceType: "product",
      resourceId: productId,
      userAgent,
    })

    return true
  },
})

/**
 * Archives a product (soft-delete). Only active owners may archive products.
 *
 * @param productId - ID of the product to archive.
 * @param userAgent - Browser user agent for audit logging.
 * @returns `true` on success.
 */
export const archive = zMutation({
  args: archiveProductArgs,
  handler: async (ctx, { productId, userAgent }) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "archiveProduct", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const product = await ctx.db.get(productId)
    if (!product) throw new Error("Product not found")
    if (product.status === "archived")
      throw new Error("Product is already archived")

    await ctx.db.patch(productId, { status: "archived" })

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "product_archive",
      description: `Archived product ${product.name} (${product.skuCode})`,
      resourceType: "product",
      resourceId: productId,
      userAgent,
    })

    return true
  },
})

/**
 * Unarchives a previously archived product.
 * Only active owners may unarchive products.
 *
 * @param productId - ID of the product to unarchive.
 * @param userAgent - Browser user agent for audit logging.
 * @returns `true` on success.
 */
export const unarchive = zMutation({
  args: unarchiveProductArgs,
  handler: async (ctx, { productId, userAgent }) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "archiveProduct", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const product = await ctx.db.get(productId)
    if (!product) throw new Error("Product not found")
    if (product.status === "active") throw new Error("Product is not archived")

    await ctx.db.patch(productId, { status: "active" })

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "product_unarchive",
      description: `Unarchived product ${product.name} (${product.skuCode})`,
      resourceType: "product",
      resourceId: productId,
      userAgent,
    })

    return true
  },
})
