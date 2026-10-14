import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import {
  keywordsSchema,
  MAX_FACTOR,
  MAX_QUANTITY,
  NAME_ALLOWED,
  NUMERIC_MESSAGES,
  safeText,
} from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for creating a product.
export const createProductArgs = {
  name: safeText(1, 255, NAME_ALLOWED),
  category: z.union([
    z.literal("sacks"),
    z.literal("twines"),
    z.literal("thread"),
  ]),
  baseUom: z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")]),
  // `.finite()` is defence in depth — zod 4's number type already rejects
  // non-finite values.
  conversionFactor: z.optional(
    z
      .number({ error: NUMERIC_MESSAGES.invalidNumber })
      .finite(NUMERIC_MESSAGES.numberTooLarge)
      .min(0, NUMERIC_MESSAGES.zeroOrGreater)
      .max(MAX_FACTOR, NUMERIC_MESSAGES.factorTooLarge)
  ),
  lowStockThreshold: z.optional(
    z
      .number({ error: NUMERIC_MESSAGES.invalidNumber })
      .finite(NUMERIC_MESSAGES.numberTooLarge)
      .min(0, NUMERIC_MESSAGES.zeroOrGreater)
      .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge)
  ),
  keywords: keywordsSchema,
  // Business time ("when it happened") for imported catalog rows.
  createdAt: z.optional(z.number().int().positive().finite()),
  ...auditMeta,
}

// Arguments for updating an existing product (extends create args with ID).
export const updateProductArgs = {
  productId: zid("products"),
  imageStorageId: z.optional(z.union([z.string().max(255), z.null()])),
  ...createProductArgs,
}

// Arguments for archiving a product.
export const archiveProductArgs = {
  productId: zid("products"),
  ...auditMeta,
}

// Arguments for unarchiving a product.
export const unarchiveProductArgs = {
  productId: zid("products"),
  ...auditMeta,
}
