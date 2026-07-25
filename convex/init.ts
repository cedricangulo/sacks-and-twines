import { createAccount } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

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
