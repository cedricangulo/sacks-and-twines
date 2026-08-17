import { createAccount } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalAction } from "./_generated/server"
import { DENSE_DAYS, DISPATCH_CHUNK_DAYS } from "./lib/constants"
import { clearAllDomainTables } from "./seed/clear"

// ─── Seed result shape ─────────────────────────────────────────────────────

interface SeedResult {
  supplierCount: number
  productCount: number
  batchCount: number
  dispatchCount: number
  dispatchItemCount: number
  adjustmentCount: number
  auditLogCount: number
}

type SeedPlan = {
  products: Array<{
    id: Id<"products">
    name: string
    baseUom: "piece" | "roll" | "meter"
  }>
  batches: Array<{
    id: Id<"batches">
    productId: Id<"products">
    unitCost: number
    baseUom: string
    batchCode: string
    createdDate: number
    quantityRemaining: number
  }>
}

// ─── Internal Action: seedAll ──────────────────────────────────────────────

/**
 * Full database seed action. Creates a staff user (if not exists), finds the
 * owner user, clears all domain data in chunks, then runs the bounded seed
 * pipeline: base records → baseline dispatches → dense dispatch chunks →
 * adjustments → quantity finalization → auth logs.
 */
export const seedAll = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    // ── Idempotency guard ───────────────────────────────────────────────
    // If any domain table already has rows, treat this as already seeded and
    // return early (~0 I/O) instead of clearing + re-inserting ~17k records.
    // Use `pnpm seed:reset` (seedClean → seedAll) when a clean rebuild is
    // actually needed.
    const existing = await ctx.runQuery(internal.seed.seedStatus)
    const alreadySeeded = Object.values(existing).some((count) => count > 0)
    if (alreadySeeded) {
      console.log("\n  → Data already present — skipping seed (no-op).")
      console.log("    Use `pnpm seed:reset` to wipe and rebuild.")
      return {
        supplierCount: existing.suppliers,
        productCount: existing.products,
        batchCount: existing.batches,
        dispatchCount: existing.dispatches,
        dispatchItemCount: existing.dispatchItems,
        adjustmentCount: existing.stockAdjustments,
        auditLogCount: existing.auditLogs,
      }
    }

    // ── Find or create staff user ────────────────────────────────────────
    const rawStaffEmail = process.env.STAFF_EMAIL ?? "juandelacruz@gmail.com"
    const staffEmail = rawStaffEmail.trim().toLowerCase()
    const staffPassword = process.env.STAFF_PASSWORD
    if (!staffPassword) throw new Error("STAFF_PASSWORD env var must be set")

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
          name: process.env.STAFF_NAME || "Staff",
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

    // ── Clear existing data (chunked) ────────────────────────────────────
    console.log("\n  → Clearing existing data...")
    await clearAllDomainTables(ctx)
    const statusAfterClear = await ctx.runQuery(internal.seed.seedStatus)
    console.log("  → Post-clear status:", statusAfterClear)

    // ── Build the seeded dispatch plan ───────────────────────────────────
    const userIds = [ownerId, staffId] as Array<Id<"users">>
    const userNameMap = await ctx.runQuery(internal.seed.getUserNames)

    // ── Run the bounded seed pipeline ────────────────────────────────────
    const base = await ctx.runMutation(internal.seed.writeBase, {
      ownerId: ownerId as never,
      staffId: staffId as never,
    })
    let plan: SeedPlan = { products: base.products, batches: base.batches }

    let dispatchCount = 0
    let dispatchItemCount = 0
    let auditLogCount = base.auditLogCount

    const baseline = await ctx.runMutation(
      internal.seed.writeBaselineDispatches,
      {
        plan,
        userIds,
        userNameMap,
      }
    )
    plan = { products: plan.products, batches: baseline.batches }
    dispatchCount += baseline.dispatchCount
    dispatchItemCount += baseline.dispatchItemCount
    auditLogCount += baseline.auditLogCount

    const chunkCount = Math.ceil(DENSE_DAYS / DISPATCH_CHUNK_DAYS)
    for (let c = 0; c < chunkCount; c++) {
      const startDayIndex = c * DISPATCH_CHUNK_DAYS
      const dayCount = Math.min(DISPATCH_CHUNK_DAYS, DENSE_DAYS - startDayIndex)
      const chunk = await ctx.runMutation(internal.seed.writeDispatchChunk, {
        plan,
        userIds,
        userNameMap,
        startDayIndex,
        dayCount,
      })
      plan = { products: plan.products, batches: chunk.batches }
      dispatchCount += chunk.dispatchCount
      dispatchItemCount += chunk.dispatchItemCount
      auditLogCount += chunk.auditLogCount
      console.log(
        `  ✓ Dense chunk ${c + 1}/${chunkCount} (days ${startDayIndex + 1}-${startDayIndex + dayCount}): ${chunk.dispatchCount} dispatches`
      )
    }

    const adjustments = await ctx.runMutation(internal.seed.writeAdjustments, {
      plan,
      userIds,
      ownerId: ownerId as never,
    })
    plan = { products: plan.products, batches: adjustments.batches }
    auditLogCount += adjustments.auditLogCount

    await ctx.runMutation(internal.seed.finalizeQuantities, { plan })

    const authLogs = await ctx.runMutation(internal.seed.writeAuthLogs, {
      ownerId: ownerId as never,
    })
    auditLogCount += authLogs.auditLogCount

    const result: SeedResult = {
      supplierCount: base.supplierCount,
      productCount: plan.products.length,
      batchCount: plan.batches.length,
      dispatchCount,
      dispatchItemCount,
      adjustmentCount: adjustments.adjustmentCount,
      auditLogCount,
    }

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
 * Clean database seed action. Clears all domain data in bounded chunks,
 * leaving only the owner account (hidden in UI — users table appears empty).
 * For dev use only — testers should use seedTest.
 */
export const seedClean = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    console.log("\n  → Running seedClean...")

    const totals = await clearAllDomainTables(ctx)
    const statusAfterClear = await ctx.runQuery(internal.seed.seedStatus)
    console.log("  → Post-clear status:", statusAfterClear)

    console.log("\n  ✓ Seed clean complete!")
    console.log("    • Owner account preserved (hidden in UI)")
    console.log("    • All domain tables empty")

    return {
      supplierCount: totals.suppliers,
      productCount: totals.products,
      batchCount: totals.batches,
      dispatchCount: totals.dispatches,
      dispatchItemCount: totals.dispatchItems,
      adjustmentCount: totals.stockAdjustments,
      auditLogCount: totals.auditLogs,
    }
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
    const staffPassword = process.env.STAFF_PASSWORD
    if (!staffPassword) throw new Error("STAFF_PASSWORD env var must be set")

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
          name: process.env.STAFF_NAME || "Staff",
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
      console.log(
        `  ✓ Deactivated staff exists: ${deactivatedEmail} (${deactivatedStaffId})`
      )
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
      console.log(
        `  ✓ Created deactivated staff: ${deactivatedEmail} (${deactivatedStaffId})`
      )
    }

    // ── Clear existing data (chunked) ────────────────────────────────────
    console.log("\n  → Clearing existing data...")
    await clearAllDomainTables(ctx)

    // ── Run the write mutation ───────────────────────────────────────────
    const result = await ctx.runMutation(internal.seed.writeTest, {
      ownerId: ownerId as never,
      staffId: staffId as never,
      deactivatedStaffId: deactivatedStaffId as never,
    })

    console.log("\n  ✓ Seed test complete!")
    console.log(`    • ${result.supplierCount} suppliers`)
    console.log(
      `    • ${result.productCount} products (15 active + 1 archived)`
    )
    console.log(
      `    • ${result.batchCount} batches (active + depleted + voided)`
    )
    console.log(`    • ${result.dispatchCount} dispatches (completed + voided)`)
    console.log(`    • ${result.dispatchItemCount} dispatch items`)
    console.log(
      `    • ${result.adjustmentCount} stock adjustments (applied + voided)`
    )
    console.log(`    • ${result.auditLogCount} audit logs`)
    console.log(
      `    • 3 user accounts (owner + active staff + deactivated staff)`
    )

    return result
  },
})
