import { z } from "zod"
import { positiveQuantity } from "@/lib/form-primitives"
import {
  formatZodErrors,
  MAX_QUANTITY,
  NUMERIC_MESSAGES,
} from "@/lib/validation"

// Zod schema for stock adjustment form data: direction (add/deduct), quantity (> 0), and reason enum.
// Fractional quantities are only allowed for meter-based products (twines).
// `.finite()` is defence in depth — zod 4's number type already rejects
// non-finite values. `Number.parseFloat("1e999")` yields Infinity.
const StockAdjustmentSchema = z.object({
  direction: z.union([z.literal("add"), z.literal("deduct")]),
  quantity: positiveQuantity,
  reason: z.union([
    z.literal("damaged"),
    z.literal("lost"),
    z.literal("recount"),
    z.literal("system_reversal"),
  ]),
  // Business time override; undefined means "now".
  createdAt: z.optional(z.number().int().positive().finite()),
})

const WholeUnitStockAdjustmentSchema = StockAdjustmentSchema.extend({
  // Rebuilt rather than extended from `positiveQuantity`: its `.min(0.01)`
  // rejects zero before `.int()` runs, which would show the generic positive
  // error instead of the whole-number message users need here.
  quantity: z
    .number({ error: NUMERIC_MESSAGES.invalidNumber })
    .finite(NUMERIC_MESSAGES.numberTooLarge)
    .int(NUMERIC_MESSAGES.wholeNumber)
    .min(1, NUMERIC_MESSAGES.wholeNumber)
    .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge),
})

export type StockAdjustmentFormData = z.infer<typeof StockAdjustmentSchema>

export type StockAdjustmentFieldErrors = Partial<
  Record<keyof StockAdjustmentFormData, string>
>

// Validates raw stock-adjustment input against the schema and returns typed errors or the parsed data.
// When `allowDecimal` is false, quantities must be whole numbers.
export function validateStockAdjustment(
  values: unknown,
  options?: { allowDecimal?: boolean }
) {
  const schema =
    options?.allowDecimal === false
      ? WholeUnitStockAdjustmentSchema
      : StockAdjustmentSchema
  const result = schema.safeParse(values)
  if (result.success) {
    return {
      success: true as const,
      errors: {} as StockAdjustmentFieldErrors,
      data: result.data,
    }
  }
  return {
    success: false as const,
    errors: formatZodErrors(result.error) as StockAdjustmentFieldErrors,
    data: undefined,
  }
}
