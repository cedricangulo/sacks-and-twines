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

export const seedAll = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    // ── Find or create staff user ────────────────────────────────────────
    const staffEmail = process.env.STAFF_EMAIL ?? "juandelacruz@gmail.com"
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
    const ownerEmail = process.env.OWNER_EMAIL
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
