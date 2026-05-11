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

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()
    if (existing !== null) {
      throw new Error("A user with this email already exists")
    }

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

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "user_create",
      description: `Created staff ${email}`,
    })

    return newUser
  },
})

export const deactivate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) {
      throw new Error("Unauthorized")
    }

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner") {
      throw new Error("Only owners can deactivate users")
    }

    if (callerId.toString() === userId.toString()) {
      throw new Error("You cannot deactivate yourself")
    }

    const target = await ctx.db.get(userId)
    if (!target) {
      throw new Error("User not found")
    }

    if (target.role !== "staff") {
      throw new Error("Can only deactivate staff users")
    }

    await ctx.db.patch(userId, { status: "deactivated" })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "user_deactivate",
      description: `Deactivated user ${target.email ?? String(userId)}`,
    })

    return true
  },
})
