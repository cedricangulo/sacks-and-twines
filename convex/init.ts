import { createAccount } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

const OWNER_EMAIL = process.env.OWNER_EMAIL!.trim().toLowerCase()
const OWNER_PASSWORD = process.env.OWNER_PASSWORD!

/**
 * Seeds the initial owner account on first deployment.
 * Skips if an owner with the configured email already exists.
 * Uses `OWNER_EMAIL` and `OWNER_PASSWORD` environment variables.
 */
export const seedOwner = internalAction({
  args: {},
  handler: async (ctx) => {
    // Make sure OWNER_EMAIL is defined before passing it
    if (!OWNER_EMAIL || !OWNER_PASSWORD) {
      throw new Error("OWNER_EMAIL and OWNER_PASSWORD env vars must be set")
    }

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
        name: "Owner",
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
