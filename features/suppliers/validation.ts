import { z } from "zod"
import type { Id } from "@/convex/_generated/dataModel"
import {
  contactNumberSchema,
  formatZodErrors,
  normalizedString,
} from "@/lib/validation"

export const createSupplierArgs = {
  companyName: normalizedString(2, 255, "Enter a valid company name."),
  contactPerson: normalizedString(2, 255, "Enter a valid contact person name."),
  contactNumber: contactNumberSchema,
  address: normalizedString(10, 500, "Enter a valid address."),
}

export const SupplierSchema = z.object(createSupplierArgs)

export type SupplierFormData = z.infer<typeof SupplierSchema>

export type SupplierFieldErrors = Partial<
  Record<keyof SupplierFormData, string>
>

export interface Supplier {
  _id: Id<"suppliers">
  _creationTime: number
  companyName: string
  contactPerson?: string
  contactNumber?: string
  address?: string
  archivedAt?: number
  batchCount?: number
}

export function validateSupplier(values: unknown) {
  const result = SupplierSchema.safeParse(values)
  if (result.success) {
    return {
      success: true as const,
      errors: {} as SupplierFieldErrors,
      data: result.data,
    }
  }
  return {
    success: false as const,
    errors: formatZodErrors(result.error) as SupplierFieldErrors,
    data: undefined,
  }
}
