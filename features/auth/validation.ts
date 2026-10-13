import { z } from "zod"

export const EMAIL_MAX = 254
export const PASSWORD_MAX = 128
export const OTP_LENGTH = 8

/**
 * Zod schemas for the sign-in flow.
 *
 * These previously lived inline in `hooks/submit.ts`. They are extracted so the
 * two auth steps share one definition and can be tested like every other form.
 *
 * Note `OtpSchema` is an exact-length digit match rather than `.min(8)`: the
 * former accepted any 8+ character string such as "aaaaaaaa", while the OTP
 * input already constrains input to digits via `REGEXP_ONLY_DIGITS` and strips
 * non-digits on paste.
 */
export const SignInSchema = z.object({
  email: z
    .email("Please enter a valid email")
    .max(EMAIL_MAX, "Email is too long"),
  // Deliberately not trimmed and not `.max`-restricted on the client beyond the
  // DoS guard: leading/trailing whitespace can be a legitimate part of a
  // password, and truncation would silently change the credential.
  password: z.string().min(1, "Password is required").max(PASSWORD_MAX),
})

export const OtpSchema = z.object({
  code: z
    .string()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), "Enter the 8-digit code"),
})

export type SignInFormData = z.infer<typeof SignInSchema>
