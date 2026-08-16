import { Migrations } from "@convex-dev/migrations"
import { components } from "./_generated/api"
import { DataModel } from "./_generated/dataModel"
import { orDatePart } from "./lib/orNumber"

export const migrations = new Migrations<DataModel>(components.migrations)

// Migration runner — call to execute pending migrations.
export const run = migrations.runner()

/**
 * Backfills user profiles with default `role` ("staff") and `status` ("active")
 * where they are missing.
 */
export const createUserProfiles = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    // Backfill users table: if role/status missing, set defaults.
    const needsRole = user.role === undefined || user.role === null
    const needsStatus = user.status === undefined || user.status === null
    if (needsRole || needsStatus) {
      await ctx.db.patch(user._id, {
        ...(needsRole ? { role: "staff" } : {}),
        ...(needsStatus ? { status: "active" } : {}),
      })
    }
  },
})

/**
 * Sets the initial developer email as owner with active status.
 * One-time migration for existing deployments.
 */
export const setOwnerProfile = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    if (user.email === "cdrcangulo@gmail.com") {
      await ctx.db.patch(user._id, { role: "owner", status: "active" })
    }
  },
})

/**
 * Backfills `userName` and `itemCount` fields on existing dispatch records
 * for denormalized display performance.
 */
export const backfillDispatches = migrations.define({
  table: "dispatches",
  migrateOne: async (ctx, dispatch) => {
    if (dispatch.userName !== undefined && dispatch.itemCount !== undefined)
      return
    const [user, items] = await Promise.all([
      ctx.db.get(dispatch.userId),
      ctx.db
        .query("dispatchItems")
        .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
        .collect(),
    ])
    await ctx.db.patch(dispatch._id, {
      userName: user?.name ?? "Unknown",
      itemCount: items.length,
    })
  },
})

/**
 * Backfills `totalQuantity` on dispatch records that predate the field by
 * summing their dispatch items' dispatch quantities.
 */
export const backfillDispatchTotalQuantities = migrations.define({
  table: "dispatches",
  migrateOne: async (ctx, dispatch) => {
    if (dispatch.totalQuantity !== undefined) return
    const items = await ctx.db
      .query("dispatchItems")
      .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
      .collect()
    const totalQuantity = items.reduce(
      (sum, item) => sum + item.dispatchQuantity,
      0
    )
    await ctx.db.patch(dispatch._id, { totalQuantity })
  },
})

/**
 * Backfills `totalValue` on dispatch records that predate the field by
 * summing their dispatch items' `quantityDeducted * unitCost`.
 */
export const backfillDispatchTotalValues = migrations.define({
  table: "dispatches",
  migrateOne: async (ctx, dispatch) => {
    if (dispatch.totalValue !== undefined) return
    const items = await ctx.db
      .query("dispatchItems")
      .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
      .collect()
    const totalValue = items.reduce(
      (sum, item) => sum + item.quantityDeducted * item.unitCost,
      0
    )
    await ctx.db.patch(dispatch._id, { totalValue })
  },
})

/**
 * Backfills `batchCount` on supplier records for denormalized display.
 */
export const backfillSuppliers = migrations.define({
  table: "suppliers",
  migrateOne: async (ctx, supplier) => {
    if (supplier.batchCount !== undefined) return
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplier._id))
      .collect()
    await ctx.db.patch(supplier._id, { batchCount: batches.length })
  },
})

/**
 * Backfills `batchCount` on product records for denormalized display.
 */
export const backfillProductBatchCounts = migrations.define({
  table: "products",
  migrateOne: async (ctx, product) => {
    if (product.batchCount !== undefined) return
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect()
    await ctx.db.patch(product._id, { batchCount: batches.length })
  },
})

/**
 * Converts existing "kilo" dispatchUom values to "meter"
 * after schema change removing "kilo" in favor of "meter".
 */
export const replaceKiloWithMeter = migrations.define({
  table: "dispatchItems",
  migrateOne: async (ctx, item) => {
    if ((item as Record<string, unknown>).dispatchUom !== "kilo") return
    await ctx.db.patch(item._id, { dispatchUom: "meter" })
  },
})

/**
 * Converts existing "cut" dispatchUom values to "meter"
 * after schema change replacing "cut" with "meter".
 */
export const replaceCutWithMeter = migrations.define({
  table: "dispatchItems",
  migrateOne: async (ctx, item) => {
    if ((item as Record<string, unknown>).dispatchUom !== "cut") return
    await ctx.db.patch(item._id, { dispatchUom: "meter" })
  },
})

/**
 * Converts existing "cut" baseUom values on products to "meter"
 * after schema change replacing "cut" with "meter".
 */
export const replaceProductCutWithMeter = migrations.define({
  table: "products",
  migrateOne: async (ctx, product) => {
    if ((product as Record<string, unknown>).baseUom !== "cut") return
    await ctx.db.patch(product._id, { baseUom: "meter" })
  },
})

/**
 * Backfills `createdAt` on audit logs using Convex's `_creationTime`
 * so that the by_createdAt index includes all existing records.
 */
export const backfillAuditLogCreatedAt = migrations.define({
  table: "auditLogs",
  migrateOne: async (ctx, log) => {
    if (log.createdAt !== undefined) return
    await ctx.db.patch(log._id, { createdAt: log._creationTime })
  },
})

/**
 * Backfills `createdAt` on dispatches using Convex's `_creationTime`.
 * Required before range reads rely solely on the `by_createdAt` index.
 */
export const backfillDispatchCreatedAt = migrations.define({
  table: "dispatches",
  migrateOne: async (ctx, dispatch) => {
    if (dispatch.createdAt !== undefined) return
    await ctx.db.patch(dispatch._id, { createdAt: dispatch._creationTime })
  },
})

/**
 * Backfills `createdAt` on stock adjustments using Convex's `_creationTime`.
 * Required before range reads rely solely on the `by_createdAt` index.
 */
export const backfillStockAdjustmentCreatedAt = migrations.define({
  table: "stockAdjustments",
  migrateOne: async (ctx, adjustment) => {
    if (adjustment.createdAt !== undefined) return
    await ctx.db.patch(adjustment._id, { createdAt: adjustment._creationTime })
  },
})

/**
 * Renames `weightPerUnit` to `conversionFactor` on existing product records.
 * Strips the old field that no longer exists in the schema.
 */
export const renameWeightPerUnit = migrations.define({
  table: "products",
  migrateOne: async (ctx, product) => {
    const wpu = (product as Record<string, unknown>).weightPerUnit
    if (wpu === undefined || wpu === null) return
    const { weightPerUnit: _, ...rest } = product as Record<string, unknown>
    await ctx.db.replace(product._id, {
      ...rest,
      conversionFactor:
        (product as Record<string, unknown>).conversionFactor ?? wpu,
    } as never)
  },
})

// Seed products → default search keyword aliases so synonym searches (e.g.
// "straw" → Twist Twine) work for pre-existing seeded data.
const PRODUCT_KEYWORDS: Record<string, string[]> = {
  "Laminated Sack": ["sack", "laminated", "multi-wall"],
  "Assorted Sack": ["sack", "assorted"],
  "Woven Polypropylene Sack": ["sack", "pp", "polypropylene", "woven"],
  "Sand bag": ["sand", "bag", "construction"],
  "Red bag": ["red", "bag"],
  "Sewing Twine": ["twine", "sewing", "string"],
  "Banana Twine": ["twine", "banana", "baling"],
  "Twist Twine": ["twine", "twist", "straw", "hay", "tie"],
  "Sewing Thread Small": ["thread", "sewing", "small"],
  "Sewing Thread Medium": ["thread", "sewing", "medium"],
  "Sewing Thread Large": ["thread", "sewing", "large"],
}

/**
 * Backfills `keywords` (search aliases) on products that already have a
 * keyword definition but no stored `keywords` field.
 */
export const backfillProductKeywords = migrations.define({
  table: "products",
  migrateOne: async (ctx, product) => {
    if (product.keywords !== undefined) return
    const keywords = PRODUCT_KEYWORDS[product.name]
    if (!keywords) return
    await ctx.db.patch(product._id, { keywords })
  },
})

/**
 * Backfills an auto-generated official receipt (OR) tracking number on
 * dispatches that lack one. Uses `createdAt ?? _creationTime` for the date
 * portion of `OR-YYYYMMDD-####` (in Philippine time).
 */
export const backfillDispatchOrNumbers = migrations.define({
  table: "dispatches",
  migrateOne: async (ctx, dispatch) => {
    if (dispatch.orNumber !== undefined) return
    const timestampMs = dispatch.createdAt ?? dispatch._creationTime
    const datePart = orDatePart(timestampMs)

    for (let i = 0; i < 20; i++) {
      const random = Math.floor(Math.random() * 9000 + 1000).toString()
      const orNumber = `OR-${datePart}-${random}`
      const existing = await ctx.db
        .query("dispatches")
        .withIndex("by_orNumber", (q) => q.eq("orNumber", orNumber))
        .first()
      if (existing === null) {
        await ctx.db.patch(dispatch._id, { orNumber })
        return
      }
    }
    throw new Error(
      `Failed to generate a unique OR number for dispatch ${dispatch._id}`
    )
  },
})
