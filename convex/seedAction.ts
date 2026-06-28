import { createAccount } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

// ─── Internal Action: seedAll ──────────────────────────────────────────────

interface SeedResult {
  supplierCount: number
  productCount: number
  batchCount: number
  dispatchCount: number
  dispatchItemCount: number
  adjustmentCount: number
  auditLogCount: number
}

/**
 * Full database seed action. Creates a staff user (if not exists),
 * finds the owner user, then calls `seed.writeAll` to populate all
 * tables with sample data for development/demo.
 */
export const seedAll = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    // ── Find or create staff user ────────────────────────────────────────
    const rawStaffEmail = process.env.STAFF_EMAIL ?? "juandelacruz@gmail.com"
    const staffEmail = rawStaffEmail.trim().toLowerCase()
    const staffPassword = process.env.STAFF_PASSWORD ?? "staff123"

    const existingUser = await ctx.runQuery(internal.users.queries.getByEmail, {
      email: staffEmail,
    })

    let staffId: string
    if (existingUser) {
      staffId = existingUser._id
      console.log(`  ✓ Staff user exists: ${staffEmail} (${staffId})`)
    } else {
      const { user } = await createAccount(ctx, {
        provider: "password",
        account: {
          id: staffEmail,
          secret: staffPassword,
        },
        profile: {
          email: staffEmail,
          name: "Juan dela Cruz",
          role: "staff",
          status: "active",
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      })
      staffId = user._id
      console.log(`  ✓ Created staff user: ${staffEmail} (${staffId})`)
    }

    // ── Find owner user ──────────────────────────────────────────────────
    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase()
    let ownerId: string

    if (ownerEmail) {
      const existingOwner = await ctx.runQuery(
        internal.users.queries.getByEmail,
        {
          email: ownerEmail,
        }
      )
      if (existingOwner) {
        ownerId = existingOwner._id
        console.log(`  ✓ Owner found: ${ownerEmail} (${ownerId})`)
      } else {
        ownerId = staffId
        console.log(
          "  ⚠ Owner email in env not found — using staff as fallback"
        )
      }
    } else {
      ownerId = staffId
      console.log("  ⚠ OWNER_EMAIL not set — using staff as fallback")
    }

    // ── Clear existing data ──────────────────────────────────────────────
    await ctx.runMutation(internal.seed.clearDispatchItems, {})
    await ctx.runMutation(internal.seed.clearDispatchesAndRelated, {})
    await ctx.runMutation(internal.seed.clearBatchesAndRest, {})

    // ── Run the write mutation ───────────────────────────────────────────
    const result = await ctx.runMutation(internal.seed.writeAll, {
      ownerId: ownerId as never,
      staffId: staffId as never,
    })

    console.log("\n  ✓ Seed complete!")
    console.log(`    • ${result.supplierCount} suppliers`)
    console.log(`    • ${result.productCount} products`)
    console.log(`    • ${result.batchCount} batches`)
    console.log(`    • ${result.dispatchCount} dispatches`)
    console.log(`    • ${result.dispatchItemCount} dispatch items`)
    console.log(`    • ${result.adjustmentCount} stock adjustments`)
    console.log(`    • ${result.auditLogCount} audit logs`)

    return result
  },
})

// ─── Internal Action: seedClean ────────────────────────────────────────────

/**
 * Clean database seed action. Clears all domain data, leaving only
 * the owner account (hidden in UI — users table appears empty).
 * For dev use only — testers should use seedTest.
 */
export const seedClean = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    console.log("\n  → Running seedClean...")

    const result = await ctx.runMutation(internal.seed.writeClean, {})

    console.log("\n  ✓ Seed clean complete!")
    console.log("    • Owner account preserved (hidden in UI)")
    console.log("    • All domain tables empty")

    return result
  },
})

// ─── Internal Action: seedTest ─────────────────────────────────────────────

/**
 * Test database seed action. Creates owner, active staff, and deactivated staff,
 * then populates with real products plus edge case fixtures for QA testing.
 * Includes: archived product, depleted batch, voided batch, voided dispatch,
 * voided adjustment, and realistic audit logs.
 */
export const seedTest = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    console.log("\n  → Running seedTest...")

    // ── Find or create staff user ────────────────────────────────────────
    const rawStaffEmail = process.env.STAFF_EMAIL ?? "juandelacruz@gmail.com"
    const staffEmail = rawStaffEmail.trim().toLowerCase()
    const staffPassword = process.env.STAFF_PASSWORD ?? "staff123"

    const existingUser = await ctx.runQuery(internal.users.queries.getByEmail, {
      email: staffEmail,
    })

    let staffId: string
    if (existingUser) {
      staffId = existingUser._id
      console.log(`  ✓ Staff user exists: ${staffEmail} (${staffId})`)
    } else {
      const { user } = await createAccount(ctx, {
        provider: "password",
        account: {
          id: staffEmail,
          secret: staffPassword,
        },
        profile: {
          email: staffEmail,
          name: "Juan dela Cruz",
          role: "staff",
          status: "active",
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      })
      staffId = user._id
      console.log(`  ✓ Created staff user: ${staffEmail} (${staffId})`)
    }

    // ── Find owner user ──────────────────────────────────────────────────
    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase()
    let ownerId: string

    if (ownerEmail) {
      const existingOwner = await ctx.runQuery(
        internal.users.queries.getByEmail,
        {
          email: ownerEmail,
        }
      )
      if (existingOwner) {
        ownerId = existingOwner._id
        console.log(`  ✓ Owner found: ${ownerEmail} (${ownerId})`)
      } else {
        ownerId = staffId
        console.log(
          "  ⚠ Owner email in env not found — using staff as fallback"
        )
      }
    } else {
      ownerId = staffId
      console.log("  ⚠ OWNER_EMAIL not set — using staff as fallback")
    }

    // ── Create deactivated staff user ────────────────────────────────────
    const deactivatedEmail = "deactivated@test.com"
    const deactivatedPassword = "staff123"

    const existingDeactivated = await ctx.runQuery(
      internal.users.queries.getByEmail,
      {
        email: deactivatedEmail,
      }
    )

    let deactivatedStaffId: string
    if (existingDeactivated) {
      deactivatedStaffId = existingDeactivated._id
      console.log(`  ✓ Deactivated staff exists: ${deactivatedEmail} (${deactivatedStaffId})`)
    } else {
      const { user } = await createAccount(ctx, {
        provider: "password",
        account: {
          id: deactivatedEmail,
          secret: deactivatedPassword,
        },
        profile: {
          email: deactivatedEmail,
          name: "Deactivated Staff",
          role: "staff",
          status: "deactivated",
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      })
      deactivatedStaffId = user._id
      console.log(`  ✓ Created deactivated staff: ${deactivatedEmail} (${deactivatedStaffId})`)
    }

    // ── Run the write mutation ───────────────────────────────────────────
    const result = await ctx.runMutation(internal.seed.writeTest, {
      ownerId: ownerId as never,
      staffId: staffId as never,
      deactivatedStaffId: deactivatedStaffId as never,
    })

    console.log("\n  ✓ Seed test complete!")
    console.log(`    • ${result.supplierCount} suppliers`)
    console.log(`    • ${result.productCount} products (15 active + 1 archived)`)
    console.log(`    • ${result.batchCount} batches (active + depleted + voided)`)
    console.log(`    • ${result.dispatchCount} dispatches (completed + voided)`)
    console.log(`    • ${result.dispatchItemCount} dispatch items`)
    console.log(`    • ${result.adjustmentCount} stock adjustments (applied + voided)`)
    console.log(`    • ${result.auditLogCount} audit logs`)
    console.log(`    • 3 user accounts (owner + active staff + deactivated staff)`)

    return result
  },
})
