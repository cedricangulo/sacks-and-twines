import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Lists products with their last supplier and image URL.
 *
 * `status` is pushed to the `by_status` index rather than collecting the whole
 * table and filtering client-side. Defaults to `"active"`, matching the
 * inventory page's default filter — archived rows were previously shipped to
 * the client only to be discarded there. `"all"` reads both index ranges, which
 * is still bounded and indexed rather than a full scan.
 *
 * `lastSupplierId` is read from the denormalized field, with a live fallback
 * for rows written before `backfillProductLastSupplierId` ran. The fallback is
 * only taken when the field is missing, so the read set stays narrow once the
 * backfill has run.
 *
 * Owner-only access.
 * @param status - Optional product status filter. Defaults to "active".
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("all"), v.literal("active"), v.literal("archived"))
    ),
  },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const resolvedStatus = status ?? "active"
    const products =
      resolvedStatus === "all"
        ? (
            await Promise.all([
              ctx.db
                .query("products")
                .withIndex("by_status", (q) => q.eq("status", "active"))
                .collect(),
              ctx.db
                .query("products")
                .withIndex("by_status", (q) => q.eq("status", "archived"))
                .collect(),
            ])
          )
            .flat()
            .sort((a, b) => a._creationTime - b._creationTime)
        : await ctx.db
            .query("products")
            .withIndex("by_status", (q) => q.eq("status", resolvedStatus))
            .collect()

    return await Promise.all(
      products.map(async (product) => {
        let lastSupplierId = product.lastSupplierId

        if (lastSupplierId === undefined) {
          const lastBatch = await ctx.db
            .query("batches")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .order("desc")
            .first()
          lastSupplierId = lastBatch?.supplierId
        }

        let imageUrl: string | undefined
        if (product.imagePath) {
          try {
            const url = await ctx.storage.getUrl(product.imagePath)
            imageUrl = url ?? undefined
          } catch {
            imageUrl = undefined
          }
        }

        return {
          ...product,
          lastSupplierId,
          imageUrl,
        }
      })
    )
  },
})

/**
 * Lists only active (non-archived) products with their last supplier and image
 * URL. Same shape as `list`, narrowed to active products.
 *
 * Owner-only access.
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    return await Promise.all(
      products.map(async (product) => {
        let lastSupplierId = product.lastSupplierId

        if (lastSupplierId === undefined) {
          const lastBatch = await ctx.db
            .query("batches")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .order("desc")
            .first()
          lastSupplierId = lastBatch?.supplierId
        }

        let imageUrl: string | undefined
        if (product.imagePath) {
          try {
            const url = await ctx.storage.getUrl(product.imagePath)
            imageUrl = url ?? undefined
          } catch {
            imageUrl = undefined
          }
        }

        return {
          ...product,
          lastSupplierId,
          imageUrl,
        }
      })
    )
  },
})

/**
 * Lists active products with their available (FIFO-ordered) batches for dispatch.
 *
 * `lastSupplierId` is read from the denormalized field rather than issuing a
 * second `batches` index range per product; the live lookup only runs for rows
 * written before `backfillProductLastSupplierId`. This halves the per-product
 * index-range count on the staff landing page.
 *
 * Accessible to any active user (owner or staff).
 */
export const listDispatchReady = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.status !== "active") throw new Error("Unauthorized")

    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    return await Promise.all(
      products.map(async (product) => {
        // `lastSupplierId` and `activeBatches` are independent — fetch in parallel.
        const [lastBatchFallback, activeBatches] = await Promise.all([
          product.lastSupplierId === undefined
            ? ctx.db
                .query("batches")
                .withIndex("by_product", (q) => q.eq("productId", product._id))
                .order("desc")
                .first()
            : null,
          ctx.db
            .query("batches")
            .withIndex("by_product_status", (q) =>
              q.eq("productId", product._id).eq("status", "active")
            )
            .order("asc")
            .collect(),
        ])

        const lastSupplierId =
          product.lastSupplierId ?? lastBatchFallback?.supplierId

        const fifoBatches = activeBatches.filter((b) => b.quantityRemaining > 0)

        let imageUrl: string | undefined
        if (product.imagePath) {
          try {
            const url = await ctx.storage.getUrl(product.imagePath)
            imageUrl = url ?? undefined
          } catch {
            imageUrl = undefined
          }
        }

        return {
          ...product,
          lastSupplierId,
          imageUrl,
          availableBatches: fifoBatches.map((b) => ({
            _id: b._id,
            batchCode: b.batchCode,
            quantityRemaining: b.quantityRemaining,
            unitCost: b.unitCost,
            _creationTime: b._creationTime,
          })),
        }
      })
    )
  },
})

/**
 * Fetches a single product by ID. Accessible to any authenticated user.
 * @param productId - ID of the product to fetch.
 */
export const getById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    return await ctx.db.get(productId)
  },
})

/**
 * Fetches a product with additional edit context (image URL, batch count).
 * Owner-only access.
 * @param productId - ID of the product to fetch.
 */
export const getEditDetail = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const product = await ctx.db.get(productId)
    if (!product) return null

    let batchCount = product.batchCount
    if (batchCount === undefined) {
      // Legacy fallback for products created before batchCount was
      // denormalized — the backfill migration sets this going forward.
      const batches = await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
      batchCount = batches.length
    }

    let imageUrl: string | undefined
    if (product.imagePath) {
      try {
        const url = await ctx.storage.getUrl(product.imagePath)
        imageUrl = url ?? undefined
      } catch {
        imageUrl = undefined
      }
    }

    return {
      ...product,
      imageUrl,
      batchCount,
    }
  },
})
