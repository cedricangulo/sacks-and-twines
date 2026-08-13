import { z } from "zod"
import type { Id } from "@/convex/_generated/dataModel"
import { formatZodErrors } from "@/lib/validation"

// A product record as displayed in the inventory table.
export interface Product {
  _id: Id<"products">
  _creationTime: number
  createdAt?: number
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
  imageUrl?: string
  lastSupplierId?: Id<"suppliers">
  keywords?: string[]
}

// A batch record as displayed in the batch sub-table.
export interface Batch {
  _id: Id<"batches">
  _creationTime: number
  createdAt?: number
  productId: Id<"products">
  supplierId: Id<"suppliers">
  userId: Id<"users">
  batchCode: string
  totalProcurementCost: number
  unitCost: number
  quantityReceived: number
  quantityRemaining: number
  status: "active" | "depleted" | "voided"
}

// A batch record enriched with product info, supplier name, and editability flags.
export interface BatchDetail extends Batch {
  productName: string | null
  category: string | null
  baseUom: string | null
  conversionFactor: number | null
  lowStockThreshold: number | null
  imagePath: string | null
  supplierName: string | null
  dispatchCount: number
  activeAdjustmentCount: number
  canEditQuantities: boolean
}

const positiveNumber = z.number().min(0.01, "Must be greater than zero")

// Zod schema for stock-in form data: mode, product selection, category, batch quantities, etc.
const StockInSchema = z.object({
  mode: z.union([z.literal("existing"), z.literal("new")]),
  productId: z.optional(z.string().min(1)),
  name: z.optional(z.string().min(1).max(255)),
  category: z.optional(
    z.union([z.literal("sacks"), z.literal("twines"), z.literal("thread")])
  ),
  baseUom: z.optional(
    z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")])
  ),
  conversionFactor: z.optional(z.number().min(0)),
  supplierId: z.string().min(1, "Supplier is required"),
  quantityReceived: positiveNumber,
  totalProcurementCost: positiveNumber,
  lowStockThreshold: z.optional(z.number().min(0)),
  imageStorageId: z.optional(z.string()),
  keywords: z.optional(z.array(z.string())),
})

export type StockInFormData = z.infer<typeof StockInSchema>

export type StockInFieldErrors = Partial<Record<keyof StockInFormData, string>>

// Validates stock-in form input and returns typed errors or parsed data.
export function validateStockIn(values: unknown) {
  const result = StockInSchema.safeParse(values)
  if (result.success) {
    return {
      success: true as const,
      errors: {} as StockInFieldErrors,
      data: result.data,
    }
  }
  return {
    success: false as const,
    errors: formatZodErrors(result.error) as StockInFieldErrors,
    data: undefined,
  }
}

// Zod schema for batch update form data: supplier, quantities, and optional product fields.
const BatchUpdateSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  quantityReceived: positiveNumber,
  totalProcurementCost: positiveNumber,
  category: z.optional(
    z.union([z.literal("sacks"), z.literal("twines"), z.literal("thread")])
  ),
  baseUom: z.optional(
    z.union([z.literal("piece"), z.literal("roll"), z.literal("meter")])
  ),
  conversionFactor: z.optional(z.number().min(0)),
  lowStockThreshold: z.optional(z.number().min(0)),
})

export type BatchUpdateFormData = z.infer<typeof BatchUpdateSchema>

export type BatchUpdateFieldErrors = Partial<
  Record<keyof BatchUpdateFormData, string>
>

// Validates batch update form input and returns typed errors or parsed data.
export function validateBatchUpdate(values: unknown) {
  const result = BatchUpdateSchema.safeParse(values)
  if (result.success) {
    return {
      success: true as const,
      errors: {} as BatchUpdateFieldErrors,
      data: result.data,
    }
  }
  return {
    success: false as const,
    errors: formatZodErrors(result.error) as BatchUpdateFieldErrors,
    data: undefined,
  }
}
