import { z } from "zod"

const normalizeText = (value: unknown) => {
  const text = String(value ?? "")
  let clean = text.trim()
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "")
  clean = clean.replace(/<[^>]*>/g, "")
  clean = clean.replace(/\s+/g, " ").trim()
  return clean
}

export const normalizedString = (min: number, max: number, message?: string) =>
  z.preprocess(
    normalizeText,
    z
      .string()
      .min(min, message ?? `Must be at least ${min} characters`)
      .max(max, message ?? `Must be at most ${max} characters`)
  )

export const contactNumberSchema = z
  .string()
  .transform((value) => {
    const clean = String(value ?? "").replace(/[\x00-\x1F\x7F]/g, "")
    const digits = clean.replace(/[^\d]/g, "")
    const hasPlus = clean.trim().startsWith("+")
    return hasPlus ? `+${digits}` : digits
  })
  .superRefine((value, ctx) => {
    const isMobile = /^(\+?639|09)\d{9}$/.test(value)
    const isLandline = /^(\+?63\d{1,2}|0\d{1,2})\d{7}$/.test(value)

    if (!isMobile && !isLandline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Please enter a valid PH mobile (e.g., 0917...) or landline number.",
      })
    }
  })
