import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { normalizedString } from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for creating a product.
export const createProductArgs = {
  name: normalizedString(1, 255),
  category: z.union([
    z.literal("sacks"),
    z.literal("twines"),
    z.literal("thread"),
  ]),
  baseUom: z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")]),
  conversionFactor: z.optional(z.number().min(0)),
  lowStockThreshold: z.optional(z.number().min(0)),
  ...auditMeta,
}

// Arguments for updating an existing product (extends create args with ID).
export const updateProductArgs = {
  productId: zid("products"),
  imageStorageId: z.optional(z.union([z.string(), z.null()])),
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
