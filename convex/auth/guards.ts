import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

async function resolveCaller(ctx: MutationCtx) {
  const callerId = await getAuthUserId(ctx)
  if (callerId === null) throw new Error("Unauthorized")

  const caller = await ctx.db.get(callerId)
  return { callerId, caller }
}

export async function requireOwner(
  ctx: MutationCtx,
  action?: string
): Promise<Id<"users">> {
  const { callerId, caller } = await resolveCaller(ctx)
  if (!caller || caller.role !== "owner" || caller.status !== "active")
    throw new Error(
      action
        ? `Only owners can ${action}`
        : "Only owners can perform this action"
    )
  return callerId as Id<"users">
}

export async function requireActive(ctx: MutationCtx): Promise<Id<"users">> {
  const { callerId, caller } = await resolveCaller(ctx)
  if (!caller || caller.status !== "active")
    throw new Error("Account deactivated")
  return callerId
}
