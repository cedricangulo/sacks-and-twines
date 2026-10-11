import { z } from "zod"
import type { Id } from "@/convex/_generated/dataModel"
import {
  keywordsField,
  nonNegativeAmount,
  nonNegativeFactor,
  productNameField,
} from "@/lib/form-primitives"
import { formatZodErrors } from "@/lib/validation"

// A batch available for dispatch with remaining quantity and cost info.
export interface DispatchBatch {
  _id: Id<"batches">
  batchCode: string
  quantityRemaining: number
  unitCost: number
  _creationTime: number
}

// A product ready for dispatch with stock details and available batches.
export interface DispatchReadyProduct {
  _id: Id<"products">
  _creationTime: number
  skuCode: string
  name: string
  category: "sacks" | "twines" | "thread"
  baseUom: "piece" | "roll" | "meter"
  conversionFactor?: number
  currentQuantity: number
  totalAssetValue: number
  lowStockThreshold: number
  status: "active" | "archived"
  imagePath?: string
  lastSupplierId?: Id<"suppliers">
  imageUrl?: string
  keywords?: string[]
  availableBatches: DispatchBatch[]
}

// Zod schema for product update form data.
// `name` was previously a bare `z.string().min(1)`, which accepted a
// whitespace-only value and any markup; it now shares the server's normalizer
// and rejects disallowed characters rather than stripping them.
const ProductUpdateSchema = z.object({
  name: productNameField(),
  category: z.union([
    z.literal("sacks"),
    z.literal("twines"),
    z.literal("thread"),
  ]),
  baseUom: z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")]),
  // `.finite()` is defence in depth — zod 4's number type already rejects
  // non-finite values.
  conversionFactor: z.optional(nonNegativeFactor),
  lowStockThreshold: z.optional(nonNegativeAmount),
  keywords: keywordsField,
})

export type ProductUpdateFormData = z.infer<typeof ProductUpdateSchema>

export type ProductUpdateFieldErrors = Partial<
  Record<keyof ProductUpdateFormData, string>
>

// Validates product update input and returns typed errors or parsed data.
export function validateProductUpdate(values: unknown) {
  const result = ProductUpdateSchema.safeParse(values)
  if (result.success) {
    return {
      success: true as const,
      errors: {} as ProductUpdateFieldErrors,
      data: result.data,
    }
  }
  return {
    success: false as const,
    errors: formatZodErrors(result.error) as ProductUpdateFieldErrors,
    data: undefined,
  }
}
