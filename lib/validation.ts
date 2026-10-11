export {
  contactNumberSchema,
  FREE_TEXT_ALLOWED,
  keywordsSchema,
  MAX_COST,
  MAX_FACTOR,
  MAX_QUANTITY,
  NAME_ALLOWED,
  NUMERIC_MESSAGES,
  normalizedString,
  normalizeText,
  optionalSafeText,
  REFERENCE_ALLOWED,
  safeText,
} from "@/convex/validators/helpers"

import { z } from "zod"

export function formatZodErrors(error: z.ZodError) {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    // Join the full path so nested issues are addressable — a dispatch error at
    // `items[0].quantity` must key as "items.0.quantity". Mapping only
    // `issue.path[0]` produced keys like "0" and dropped array errors entirely
    // via the truthiness check below.
    const key = issue.path.join(".")
    if (key !== "") {
      if (!errors[key]) {
        errors[key] = issue.message
      }
    }
  }

  return errors
}
