import { createAccount, getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation } from "../_generated/server"

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { name, email, password }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) {
      throw new Error("Unauthorized")
    }

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner") {
      throw new Error("Only owners can create staff users")
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters")
    }

    // Ensure email is unique using index
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()
    if (existing !== null) {
      throw new Error("A user with this email already exists")
    }

    // Create the auth account using Convex Auth helper. It requires an Action
    // context at the type level; pass `ctx as any` per community guidance.
    // This will create the account and also create/return the auth user object.
    // The `profile` passed here will be available on the created user document.
    // createAccount expects an Action context at the type level; pass the
    // mutation ctx at runtime by casting to `never` to avoid `any` errors.
    const newUser = await createAccount(ctx as unknown as never, {
      provider: "password",
      account: {
        id: email,
        secret: password,
      },
      profile: {
        email,
        name,
        role: "staff",
        status: "active",
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    })

    // Audit log
    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "user_create",
      description: `Created staff ${email}`,
    })

    return newUser
  },
})
