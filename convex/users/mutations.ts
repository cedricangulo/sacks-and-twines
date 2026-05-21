import { createAccount, getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "../_generated/api"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { createUserArgs, deactivateUserArgs } from "../validators/users"

export const create = zMutation({
  args: createUserArgs,
  handler: async (ctx, { name, email, password, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) {
      throw new Error("Unauthorized")
    }

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner" || caller.status !== "active") {
      throw new Error("Only owners can create staff users")
    }

    await Promise.all([
      perUserLimit(ctx, "createUser", callerId),
      globalLimit(ctx, "globalCreateUser"),
    ])

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

    if (newUser) {
      await ctx.runMutation(internal.auditLogs.mutations.log, {
        userId: callerId,
        action: "user_create",
        description: `Created staff ${email}`,
        resourceType: "user",
        resourceId: newUser.user._id,
        userAgent,
      })
    }

    return newUser.user
  },
})

export const deactivate = zMutation({
  args: deactivateUserArgs,
  handler: async (ctx, { userId, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) {
      throw new Error("Unauthorized")
    }

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner" || caller.status !== "active") {
      throw new Error("Only owners can deactivate users")
    }

    if (callerId.toString() === userId.toString()) {
      throw new Error("You cannot deactivate yourself")
    }

    await Promise.all([
      perUserLimit(ctx, "deactivateUser", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const target = await ctx.db.get(userId)
    if (!target) {
      throw new Error("User not found")
    }

    if (target.role !== "staff") {
      throw new Error("Can only deactivate staff users")
    }

    await ctx.db.patch(userId, { status: "deactivated" })

    await ctx.runMutation(internal.auditLogs.mutations.log, {
      userId: callerId,
      action: "user_deactivate",
      description: `Deactivated user ${target.email ?? String(userId)}`,
      resourceType: "user",
      resourceId: userId,
      userAgent,
    })

    return true
  },
})
