import { createAccount } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import {
  ACCOUNT_TABLES,
  clearAllDomainTables,
  clearTableRows,
} from "./seed/clear"

export const seedOwner = internalAction({
  args: {},
  handler: async (ctx) => {
    const rawEmail = process.env.OWNER_EMAIL
    const rawPassword = process.env.OWNER_PASSWORD
    if (!rawEmail || !rawPassword) {
      throw new Error("OWNER_EMAIL and OWNER_PASSWORD env vars must be set")
    }
    const OWNER_EMAIL = rawEmail.trim().toLowerCase()
    const OWNER_PASSWORD = rawPassword
    const OWNER_NAME = (process.env.OWNER_NAME ?? "Owner").trim()

    const existing = await ctx.runQuery(
      internal.users.queries.getOwnerByEmail,
      {
        email: OWNER_EMAIL, // ← must be passed here
      }
    )

    if (existing !== null) {
      console.log("Owner already exists, skipping seed.")
      return { kind: "skipped" }
    }

    await createAccount(ctx, {
      provider: "password",
      account: {
        id: OWNER_EMAIL,
        secret: OWNER_PASSWORD,
      },
      profile: {
        email: OWNER_EMAIL,
        name: OWNER_NAME,
        role: "owner",
        status: "active",
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    })

    console.log("Owner account seeded.")
    return { kind: "created" }
  },
})

/**
 * Destructive env-driven account sync. Requires explicit `{ confirm: true }`
 * (the `pnpm sync:accounts` script prompts first), clears every domain table,
 * removes ALL accounts and their auth records, then recreates the owner and
 * staff accounts from the deployment environment variables
 * (OWNER_NAME/OWNER_EMAIL/OWNER_PASSWORD, STAFF_NAME/STAFF_EMAIL/STAFF_PASSWORD).
 */
export const syncAccounts = internalAction({
  args: { confirm: v.boolean() },
  handler: async (ctx, { confirm }) => {
    if (confirm !== true) {
      throw new Error("Aborted: pass { confirm: true } to run syncAccounts")
    }

    const ownerEmail = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase()
    const ownerPassword = process.env.OWNER_PASSWORD ?? ""
    const ownerName = (process.env.OWNER_NAME ?? "Owner").trim()
    const staffEmail = (process.env.STAFF_EMAIL ?? "").trim().toLowerCase()
    const staffPassword = process.env.STAFF_PASSWORD ?? ""
    const staffName = (process.env.STAFF_NAME ?? "Staff").trim()

    if (!ownerEmail || !ownerPassword) {
      throw new Error("OWNER_EMAIL and OWNER_PASSWORD env vars must be set")
    }
    if (!staffEmail || !staffPassword) {
      throw new Error("STAFF_EMAIL and STAFF_PASSWORD env vars must be set")
    }

    console.log("\n→ Clearing domain data...")
    const cleared = await clearAllDomainTables(ctx)

    console.log("\n→ Removing existing accounts...")
    const removed: Record<string, number> = {}
    for (const table of ACCOUNT_TABLES) {
      removed[table] = await clearTableRows(ctx, table)
    }

    console.log("\n→ Creating owner account...")
    const { user: owner } = await createAccount(ctx, {
      provider: "password",
      account: { id: ownerEmail, secret: ownerPassword },
      profile: {
        email: ownerEmail,
        name: ownerName,
        role: "owner",
        status: "active",
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    })

    console.log("\n→ Creating staff account...")
    const { user: staff } = await createAccount(ctx, {
      provider: "password",
      account: { id: staffEmail, secret: staffPassword },
      profile: {
        email: staffEmail,
        name: staffName,
        role: "staff",
        status: "active",
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    })

    console.log("\n✓ syncAccounts complete")
    return {
      cleared,
      removed,
      created: { owner: owner.email, staff: staff.email },
    }
  },
})
