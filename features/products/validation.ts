import { z } from "zod"
import type { Id } from "@/convex/_generated/dataModel"
import { formatZodErrors } from "@/lib/validation"

export interface DispatchBatch {
  _id: Id<"batches">
  batchCode: string
  quantityRemaining: number
  unitCost: number
  _creationTime: number
}

export interface DispatchReadyProduct {
  _id: Id<"products">
  _creationTime: number
  skuCode: string
  name: string
  category: "sacks" | "twines"
  baseUom: "piece" | "roll"
  weightPerUnit?: number
  currentQuantity: number
  totalAssetValue: number
  lowStockThreshold: number
  status: "active" | "archived"
  imagePath?: string
  lastSupplierId?: Id<"suppliers">
  imageUrl?: string
  availableBatches: DispatchBatch[]
}

const ProductUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.union([z.literal("sacks"), z.literal("twines")]),
  baseUom: z.union([z.literal("piece"), z.literal("roll")]),
  weightPerUnit: z.optional(z.number().min(0)),
  lowStockThreshold: z.optional(z.number().min(0)),
})

export type ProductUpdateFormData = z.infer<typeof ProductUpdateSchema>

export type ProductUpdateFieldErrors = Partial<
  Record<keyof ProductUpdateFormData, string>
>

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
