import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

const positiveNumber = z.number().min(0.01, "Must be greater than zero")

export const stockInArgs = {
  mode: z.union([z.literal("existing"), z.literal("new")]),
  productId: z.optional(zid("products")),
  name: z.optional(z.string().min(1).max(255)),
  category: z.optional(
    z.union([z.literal("sacks"), z.literal("twines")])
  ),
  baseUom: z.optional(
    z.union([z.literal("piece"), z.literal("roll")])
  ),
  weightPerUnit: z.optional(z.number().min(0)),
  supplierId: zid("suppliers"),
  quantityReceived: positiveNumber,
  totalProcurementCost: positiveNumber,
  lowStockThreshold: z.optional(z.number().min(0)),
  ...auditMeta,
}

export const updateBatchArgs = {
  batchId: zid("batches"),
  productId: zid("products"),
  supplierId: zid("suppliers"),
  quantityReceived: positiveNumber,
  totalProcurementCost: positiveNumber,
  category: z.optional(
    z.union([z.literal("sacks"), z.literal("twines")])
  ),
  baseUom: z.optional(
    z.union([z.literal("piece"), z.literal("roll")])
  ),
  weightPerUnit: z.optional(z.number().min(0)),
  lowStockThreshold: z.optional(z.number().min(0)),
  ...auditMeta,
}

export const voidBatchArgs = {
  batchId: zid("batches"),
  reason: z.optional(z.string().max(500)),
  ...auditMeta,
}
