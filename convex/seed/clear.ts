import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type TableNames } from "../_generated/dataModel"
import { type ActionCtx, internalMutation } from "../_generated/server"
import { CLEAR_CHUNK_LIMIT } from "../lib/constants"

/**
 * Domain tables cleared on every seed reset, in delete order (children
 * before parents) so references never dangle mid-clear.
 */
export const DOMAIN_TABLES = [
  "auditLogs",
  "batches",
  "dispatchItems",
  "dispatches",
  "products",
  "stockAdjustments",
  "suppliers",
] as const

export type DomainTable = (typeof DOMAIN_TABLES)[number]

/**
 * Account/auth tables removed by `init:syncAccounts` before the seeded
 * accounts are recreated from environment variables.
 */
export const ACCOUNT_TABLES = [
  "authAccounts",
  "authSessions",
  "authRefreshTokens",
  "authVerifiers",
  "authVerificationCodes",
  "authRateLimits",
  "users",
] as const

export type AccountTable = (typeof ACCOUNT_TABLES)[number]

const MAX_CLEAR_ROUNDS = 200

/**
 * Deletes up to `limit` rows from any table in one execution budget.
 * Callers loop until a call returns fewer rows than the limit, so resets
 * never blow Convex's read/write limits. Returns the number of rows deleted.
 */
export const deleteRowsChunk = internalMutation({
  args: { table: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { table, limit }) => {
    const take = limit ?? CLEAR_CHUNK_LIMIT
    const tableName = table as TableNames
    const docs = await ctx.db.query(tableName).take(take)
    await Promise.all(docs.map((d) => ctx.db.delete(d._id)))
    return { deleted: docs.length }
  },
})

/**
 * Empties every domain table in bounded chunks. Returns a per-table count
 * of deleted rows.
 */
export async function clearAllDomainTables(
  ctx: ActionCtx
): Promise<Record<DomainTable, number>> {
  const totals = {} as Record<DomainTable, number>
  for (const table of DOMAIN_TABLES) {
    totals[table] = await clearTableRows(ctx, table)
  }
  return totals
}

/**
 * Empties a single table in bounded chunks, logging and returning how many
 * rows were deleted.
 */
export async function clearTableRows(
  ctx: ActionCtx,
  table: string
): Promise<number> {
  let deleted = 0
  for (let round = 0; round < MAX_CLEAR_ROUNDS; round++) {
    const { deleted: chunk } = await ctx.runMutation(
      internal.seed.clear.deleteRowsChunk,
      { table, limit: CLEAR_CHUNK_LIMIT }
    )
    deleted += chunk
    if (chunk < CLEAR_CHUNK_LIMIT) break
  }
  console.log(`  • Cleared ${table}: ${deleted} rows`)
  return deleted
}
