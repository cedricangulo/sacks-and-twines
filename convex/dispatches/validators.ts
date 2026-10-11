import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { CUSTOMER_REFERENCE_MAX } from "../lib/constants"
import {
  MAX_QUANTITY,
  NUMERIC_MESSAGES,
  optionalSafeText,
  REFERENCE_ALLOWED,
} from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for submitting a dispatch order (one or more items).
export const submitDispatchArgs = {
  // `CUSTOMER_REFERENCE_MAX` is shared with the client form, so a reference
  // the UI accepts can never fail server validation. Excludes `=`, `<` and
  // `>`; the actual CSV formula-injection control is `escapeCsv` at the
  // export sink.
  customerReference: optionalSafeText(
    CUSTOMER_REFERENCE_MAX,
    REFERENCE_ALLOWED
  ),
  items: z
    .array(
      z.object({
        productId: zid("products"),
        // `.finite()` is defence in depth — zod 4's number type already
        // rejects non-finite values.
        quantity: z
          .number({ error: NUMERIC_MESSAGES.invalidNumber })
          .finite(NUMERIC_MESSAGES.numberTooLarge)
          .min(0.01, NUMERIC_MESSAGES.greaterThanZero)
          .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge),
        dispatchUom: z.union([
          z.literal("piece"),
          z.literal("roll"),
          z.literal("meter"),
        ]),
      })
    )
    .min(1, "At least one item is required"),
  ...auditMeta,
}
