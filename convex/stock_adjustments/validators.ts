import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"

export const createStockAdjustmentArgs = {
  batchId: zid("batches"),
  productId: zid("products"),
  direction: z.union([z.literal("add"), z.literal("deduct")]),
  quantity: z.number().min(0.01, "Quantity must be greater than zero"),
  reason: z.union([
    z.literal("damaged"),
    z.literal("lost"),
    z.literal("recount"),
    z.literal("system_reversal"),
  ]),
  userAgent: z.optional(z.string()),
}
