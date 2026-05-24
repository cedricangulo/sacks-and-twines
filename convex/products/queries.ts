import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const products = await ctx.db.query("products").collect()

    return await Promise.all(
      products.map(async (product) => {
        const lastBatch = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .order("desc")
          .first()

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
          lastSupplierId: lastBatch?.supplierId ?? undefined,
          imageUrl,
        }
      })
    )
  },
})

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
        const lastBatch = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .order("desc")
          .first()

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
          lastSupplierId: lastBatch?.supplierId ?? undefined,
          imageUrl,
        }
      })
    )
  },
})

export const listDispatchReady = query({
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
        const lastBatch = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .order("desc")
          .first()

        const activeBatches = await ctx.db
          .query("batches")
          .withIndex("by_product_status", (q) =>
            q.eq("productId", product._id).eq("status", "active")
          )
          .order("asc")
          .collect()

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
          lastSupplierId: lastBatch?.supplierId ?? undefined,
          imageUrl,
          availableBatches: fifoBatches.map((b) => ({
            _id: b._id,
            batchCode: b.batchCode,
            quantityRemaining: b.quantityRemaining,
            unitCost: b.unitCost,
            _creationTime: b._creationTime,
            createdAt: b.createdAt,
          })),
        }
      })
    )
  },
})

export const getById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    return await ctx.db.get(productId)
  },
})

export const getEditDetail = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const product = await ctx.db.get(productId)
    if (!product) return null

    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect()

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
      batchCount: batches.length,
    }
  },
})
