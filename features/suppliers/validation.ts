import { z } from "zod"
import type { Id } from "@/convex/_generated/dataModel"
import {
  contactNumberSchema,
  formatZodErrors,
  NAME_ALLOWED,
  normalizedString,
  safeText,
} from "@/lib/validation"

export const COMPANY_NAME_MAX = 255
export const CONTACT_PERSON_MAX = 255
export const ADDRESS_MAX = 500

/**
 * Zod schema arguments for supplier form validation.
 *
 * Already the strongest form in the app — it was the one reusing the server's
 * normalizer. Upgraded from `normalizedString` to `safeText` so disallowed
 * characters are reported to the user instead of being silently removed.
 * `contactNumber` is unchanged: `contactNumberSchema` already transforms to
 * digits and validates the PH mobile/landline format, which is the correct
 * shape for a field with one known format.
 */
export const createSupplierArgs = {
  companyName: safeText(
    2,
    COMPANY_NAME_MAX,
    NAME_ALLOWED,
    "Enter a valid company name — letters, numbers, spaces and . - _ & ( ) / ' , only"
  ),
  contactPerson: safeText(
    2,
    CONTACT_PERSON_MAX,
    NAME_ALLOWED,
    "Enter a valid contact person name — letters, numbers, spaces and . - _ & ( ) / ' , only"
  ),
  contactNumber: contactNumberSchema,
  // An address is free text, so it is normalized and capped without an
  // allowlist that would reject ordinary street and unit punctuation.
  address: normalizedString(10, ADDRESS_MAX, "Enter a valid address."),
}

// Zod schema for supplier form data.
export const SupplierSchema = z.object(createSupplierArgs)

export type SupplierFormData = z.infer<typeof SupplierSchema>

export type SupplierFieldErrors = Partial<
  Record<keyof SupplierFormData, string>
>

// A supplier record with optional archive timestamp and batch count.
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

// Validates supplier form input and returns typed errors or parsed data.
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
