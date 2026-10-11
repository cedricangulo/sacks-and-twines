import { z } from "zod"
import { NAME_ALLOWED, safeText } from "@/lib/validation"

export const STAFF_NAME_MAX = 255
export const EMAIL_MAX = 254
export const PASSWORD_MAX = 128

/**
 * Zod schema for staff creation form data.
 *
 * Previously weaker than the server: `name` had no `.max` and no
 * normalization, so a whitespace-only name passed the client and then failed
 * server-side, and a name containing markup was stored unvalidated. Now it
 * rejects rather than silently rewriting the operator's input.
 */
export const StaffSchema = z.object({
  name: safeText(
    1,
    STAFF_NAME_MAX,
    NAME_ALLOWED,
    "Name is required — letters, numbers, spaces and . - _ & ( ) / ' , only"
  ),
  // `.max` guards against an unbounded body reaching the scrypt hash, which is
  // deliberately slow and therefore a cheap CPU lever if abused.
  email: z
    .email("Please enter a valid email")
    .max(EMAIL_MAX, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(PASSWORD_MAX, "Password must be at most 128 characters"),
})

export type StaffFormData = z.infer<typeof StaffSchema>

export type StaffFieldErrors = Partial<Record<keyof StaffFormData, string>>
