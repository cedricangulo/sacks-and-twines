import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { normalizedString } from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

export const createProductArgs = {
  name: normalizedString(1, 255),
  category: z.union([z.literal("sacks"), z.literal("twines")]),
  baseUom: z.union([z.literal("piece"), z.literal("roll")]),
  weightPerUnit: z.optional(z.number().min(0)),
  lowStockThreshold: z.optional(z.number().min(0)),
  ...auditMeta,
}

export const updateProductArgs = {
  productId: zid("products"),
  imageStorageId: z.optional(z.union([z.string(), z.null()])),
  ...createProductArgs,
}

export const archiveProductArgs = {
  productId: zid("products"),
  ...auditMeta,
}

export const unarchiveProductArgs = {
  productId: zid("products"),
  ...auditMeta,
}
