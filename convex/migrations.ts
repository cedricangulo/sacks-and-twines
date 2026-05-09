import { Migrations } from "@convex-dev/migrations"
import { components } from "./_generated/api"
import { DataModel } from "./_generated/dataModel"

export const migrations = new Migrations<DataModel>(components.migrations)

export const run = migrations.runner()

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

export const setOwnerProfile = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    if (user.email === "cdrcangulo@gmail.com") {
      await ctx.db.patch(user._id, { role: "owner", status: "active" })
    }
  },
})
