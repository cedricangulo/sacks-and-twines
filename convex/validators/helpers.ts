import { z } from "zod"

/**
 * Normalizes product keywords: trims, lowercases, collapses whitespace,
 * drops empties, and dedupes. Returns `undefined` when nothing remains so
 * the optional schema field stays absent.
 */
export function normalizeKeywords(
  keywords: string[] | undefined | null
): string[] | undefined {
  if (!keywords) return undefined
  const seen = new Set<string>()
  for (const raw of keywords) {
    const clean = String(raw ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
    if (clean.length > 0 && !seen.has(clean)) seen.add(clean)
  }
  return seen.size > 0 ? [...seen] : undefined
}

/**
 * Strips control characters, HTML tags, and collapses whitespace.
 */
const normalizeText = (value: unknown) => {
  const text = String(value ?? "")
  let clean = text.trim()
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "")
  clean = clean.replace(/<[^>]*>/g, "")
  clean = clean.replace(/\s+/g, " ").trim()
  return clean
}

/**
 * Creates a zod preprocess chain that sanitizes input text and enforces
 * length constraints.
 *
 * @param min - Minimum character length (after normalization).
 * @param max - Maximum character length (after normalization).
 * @param message - Optional custom validation message.
 */
export const normalizedString = (min: number, max: number, message?: string) =>
  z.preprocess(
    normalizeText,
    z
      .string()
      .min(min, message ?? `Must be at least ${min} characters`)
      .max(max, message ?? `Must be at most ${max} characters`)
  )

/**
 * Validates and normalizes Philippine phone numbers (mobile or landline).
 * Strips non-digit characters and enforces standard PH formats.
 */
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
