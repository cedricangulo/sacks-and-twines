import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation } from "../_generated/server"

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

    // Patch status to deactivated
    await ctx.db.patch(userId, { status: "deactivated" })

    // Audit log
    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "user_deactivate",
      description: `Deactivated user ${target.email ?? String(userId)}`,
    })

    return true
  },
})
