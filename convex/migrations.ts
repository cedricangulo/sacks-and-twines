import { Migrations } from "@convex-dev/migrations"
import { components } from "./_generated/api"
import { DataModel } from "./_generated/dataModel"

export const migrations = new Migrations<DataModel>(components.migrations)

/** Migration runner — call to execute pending migrations. */
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
