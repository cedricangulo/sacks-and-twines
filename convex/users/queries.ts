import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internalQuery, query } from "../_generated/server"

/**
 * Returns the currently authenticated user, or `null` if not logged in.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (userId === null) {
      return null
    }
    return await ctx.db.get(userId)
  },
})

/**
 * Lists all staff users. Owner-only access.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "staff"))
      .collect()
  },
})

/**
 * Lists all active users with their ID and name for selection dropdowns.
 */
export const listNames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const users = await ctx.db.query("users").collect()
    return users
      .filter((u) => u.status === "active")
      .map((u) => ({ _id: u._id, name: u.name }))
  },
})

/**
 * Looks up a user by email. Internal query (not exposed to clients).
 * @param email - Email address to look up.
 */
export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()
  },
})

/**
 * Looks up the owner user by email. Internal query (not exposed to clients).
 * @param email - Email address to look up.
 */
export const getOwnerByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()
  },
})

/**
 * Returns the first active owner. Used as the OTP delivery destination for
 * staff sign-ins (Resend test keys can only deliver to the owner's inbox).
 */
export const getOwnerForOtp = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "owner"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()
  },
})
