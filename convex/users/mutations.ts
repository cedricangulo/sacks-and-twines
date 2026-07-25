import { createAccount, getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "../_generated/api"
import { requireOwner } from "../auth/guards"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import { createUserArgs, deactivateUserArgs } from "./validators"

/**
 * Creates a new staff user account. Enforces unique email.
 * Only active owners may create staff users.
 *
 * @param name - Staff member's display name.
 * @param email - Staff member's email (used as login).
 * @param password - Initial password (min 8 characters).
 * @param userAgent - Browser user agent for audit logging.
 * @returns The created user object.
 */
export const create = zMutation({
  args: createUserArgs,
  handler: async (ctx, { name, email, password, userAgent }) => {
    const callerId = await requireOwner(ctx)

    await Promise.all([
      perUserLimit(ctx, "createUser", callerId),
      globalLimit(ctx, "globalCreateUser"),
    ])

    const normalizedEmail = email.trim().toLowerCase()

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique()
    if (existing !== null) {
      throw new Error("A user with this email already exists")
    }

    const newUser = await createAccount(ctx as unknown as never, {
      provider: "password",
      account: {
        id: normalizedEmail,
        secret: password,
      },
      profile: {
        email: normalizedEmail,
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
        description: `Created staff ${normalizedEmail}`,
        resourceType: "user",
        resourceId: newUser.user._id,
        userAgent,
      })
    }

    return newUser.user
  },
})

/**
 * Deactivates a staff user. Owners cannot deactivate themselves.
 * Only active owners may deactivate users.
 *
 * @param userId - ID of the staff user to deactivate.
 * @param userAgent - Browser user agent for audit logging.
 * @returns `true` on success.
 */
export const deactivate = zMutation({
  args: deactivateUserArgs,
  handler: async (ctx, { userId, userAgent }) => {
    const callerId = await requireOwner(ctx)

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
