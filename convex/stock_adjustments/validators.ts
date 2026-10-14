import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { MAX_QUANTITY, NUMERIC_MESSAGES } from "../validators/helpers"

// Arguments for creating a manual stock adjustment.
export const createStockAdjustmentArgs = {
  batchId: zid("batches"),
  productId: zid("products"),
  direction: z.union([z.literal("add"), z.literal("deduct")]),
  // `.finite()` is defence in depth — zod 4's number type already rejects
  // non-finite values. `Number("1e999")` is Infinity, which would otherwise
  // adjust stock by an unbounded amount.
  quantity: z
    .number({ error: NUMERIC_MESSAGES.invalidNumber })
    .finite(NUMERIC_MESSAGES.numberTooLarge)
    .min(0.01, NUMERIC_MESSAGES.greaterThanZero)
    .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge),
  reason: z.union([
    z.literal("damaged"),
    z.literal("lost"),
    z.literal("recount"),
    z.literal("system_reversal"),
  ]),
  // Business time ("when it happened") for backdated recount corrections.
  createdAt: z.optional(z.number().int().positive().finite()),
  userAgent: z.optional(z.string()),
}
