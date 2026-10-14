import { z } from "zod"
import type { Doc } from "@/convex/_generated/dataModel"
import { CUSTOMER_REFERENCE_MAX } from "@/convex/lib/constants"
import { positiveQuantity } from "@/lib/form-primitives"
import {
  formatZodErrors,
  optionalSafeText,
  REFERENCE_ALLOWED,
} from "@/lib/validation"

// A dispatch-item record enriched with product name, SKU, batch code, base UOM, and line total.
export interface DispatchItem extends Doc<"dispatchItems"> {
  productName: string
  productSku: string
  batchCode: string
  baseUom: string
  conversionFactor?: number
  lineTotal: number
}

export { CUSTOMER_REFERENCE_MAX }

/**
 * Zod schema for the dispatch queue submission.
 *
 * `customerReference` uses the reference allowlist, which excludes `=`, `<`
 * and `>`. The actual CSV formula-injection control is `escapeCsv` at the
 * export sink (`@/lib/csv`, `convex/lib/csv_escape`) — the allowlist only
 * narrows what a reference can contain, since freely-entered `+`/`-`/`@`
 * prefixes reach exports too and are defused there.
 */
const DispatchSubmitSchema = z.object({
  customerReference: optionalSafeText(
    CUSTOMER_REFERENCE_MAX,
    REFERENCE_ALLOWED,
    "Customer reference contains invalid characters"
  ),
  // Business time override; undefined means "now".
  createdAt: z.optional(z.number().int().positive().finite()),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: positiveQuantity,
        dispatchUom: z.union([
          z.literal("piece"),
          z.literal("roll"),
          z.literal("meter"),
        ]),
      })
    )
    .min(1, "Add at least one item to dispatch"),
})

export type DispatchSubmitFormData = z.infer<typeof DispatchSubmitSchema>

export type DispatchSubmitFieldErrors = Record<string, string>

// Validates the dispatch queue and returns typed errors or parsed data.
export function validateDispatchSubmit(values: unknown) {
  const result = DispatchSubmitSchema.safeParse(values)
  if (result.success) {
    return {
      success: true as const,
      errors: {} as DispatchSubmitFieldErrors,
      data: result.data,
    }
  }
  return {
    success: false as const,
    errors: formatZodErrors(result.error) as DispatchSubmitFieldErrors,
    data: undefined,
  }
}
