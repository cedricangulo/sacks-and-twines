import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

/** Arguments for submitting a dispatch order (one or more items). */
export const submitDispatchArgs = {
  customerReference: z.optional(z.string().max(255)),
  items: z
    .array(
      z.object({
        productId: zid("products"),
        quantity: z.number().min(0.01, "Quantity must be greater than zero"),
        dispatchUom: z.union([
          z.literal("piece"),
          z.literal("roll"),
          z.literal("kilo"),
        ]),
      })
    )
    .min(1, "At least one item is required"),
  ...auditMeta,
}
