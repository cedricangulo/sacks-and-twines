import { z } from "zod"
import { formatZodErrors } from "@/lib/validation"

// Zod schema for stock adjustment form data: direction (add/deduct), quantity (> 0), and reason enum.
// Fractional quantities are only allowed for meter-based products (twines).
const StockAdjustmentSchema = z.object({
  direction: z.union([z.literal("add"), z.literal("deduct")]),
  quantity: z.number().min(0.01, "Quantity must be greater than zero"),
  reason: z.union([
    z.literal("damaged"),
    z.literal("lost"),
    z.literal("recount"),
    z.literal("system_reversal"),
  ]),
})

const WholeUnitStockAdjustmentSchema = StockAdjustmentSchema.extend({
  quantity: z.number().int().min(1, "Quantity must be a whole number"),
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
