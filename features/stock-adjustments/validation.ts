import { z } from "zod"
import { formatZodErrors } from "@/lib/validation"

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

export type StockAdjustmentFormData = z.infer<typeof StockAdjustmentSchema>

export type StockAdjustmentFieldErrors = Partial<
  Record<keyof StockAdjustmentFormData, string>
>

export function validateStockAdjustment(values: unknown) {
  const result = StockAdjustmentSchema.safeParse(values)
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
