import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import {
  FREE_TEXT_ALLOWED,
  keywordsSchema,
  MAX_COST,
  MAX_FACTOR,
  MAX_QUANTITY,
  NAME_ALLOWED,
  NUMERIC_MESSAGES,
  optionalSafeText,
  safeText,
} from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// `.finite()` is defence in depth — zod 4's number type already rejects
// non-finite values — but stating it keeps the intent explicit and matches the
// client mirror in `lib/form-primitives.ts`. `Number("1e999")` is `Infinity`,
// which would otherwise store an unbounded cost.
const positiveNumber = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0.01, NUMERIC_MESSAGES.greaterThanZero)
  .max(MAX_COST, NUMERIC_MESSAGES.amountTooLarge)

const positiveQuantity = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0.01, NUMERIC_MESSAGES.greaterThanZero)
  .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge)

const nonNegativeQuantity = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0, NUMERIC_MESSAGES.zeroOrGreater)
  .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge)

const nonNegativeFactor = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0, NUMERIC_MESSAGES.zeroOrGreater)
  .max(MAX_FACTOR, NUMERIC_MESSAGES.factorTooLarge)

// Arguments for stocking inventory in (either into an existing product or a new one).
export const stockInArgs = {
  mode: z.union([z.literal("existing"), z.literal("new")]),
  productId: z.optional(zid("products")),
  // Previously a bare `z.string().min(1).max(255)`, which meant a product
  // created through stock-in kept its raw input: untrimmed, un-normalized and
  // with markup intact. That value is stored as `products.name` and used as the
  // `by_name` index key, so "Sacks " and "Sacks" were two distinct products.
  name: z.optional(safeText(1, 255, NAME_ALLOWED)),
  category: z.optional(
    z.union([z.literal("sacks"), z.literal("twines"), z.literal("thread")])
  ),
  baseUom: z.optional(
    z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")])
  ),
  conversionFactor: z.optional(nonNegativeFactor),
  supplierId: zid("suppliers"),
  quantityReceived: positiveQuantity,
  totalProcurementCost: positiveNumber,
  lowStockThreshold: z.optional(nonNegativeQuantity),
  imageStorageId: z.optional(z.string()),
  keywords: keywordsSchema,
  // Business time ("when it happened"), not record time. Optional so callers
  // that don't backdate get `Date.now()` in the mutation. Lets operators
  // record yesterday's delivery today or import existing stock at go-live.
  createdAt: z.optional(z.number().int().positive().finite()),
  ...auditMeta,
}

// Arguments for updating an existing batch.
export const updateBatchArgs = {
  batchId: zid("batches"),
  productId: zid("products"),
  supplierId: zid("suppliers"),
  quantityReceived: positiveQuantity,
  totalProcurementCost: positiveNumber,
  category: z.optional(
    z.union([z.literal("sacks"), z.literal("twines"), z.literal("thread")])
  ),
  baseUom: z.optional(
    z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")])
  ),
  conversionFactor: z.optional(nonNegativeFactor),
  lowStockThreshold: z.optional(nonNegativeQuantity),
  ...auditMeta,
}

// Arguments for voiding a batch.
export const voidBatchArgs = {
  batchId: zid("batches"),
  reason: z.optional(optionalSafeText(500, FREE_TEXT_ALLOWED)),
  ...auditMeta,
}
