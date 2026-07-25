export {
  contactNumberSchema,
  normalizedString,
} from "@/convex/validators/helpers"

import { z } from "zod"

export function formatZodErrors(error: z.ZodError) {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path[0]
    if (key) {
      const fieldName = String(key)
      if (!errors[fieldName]) {
        errors[fieldName] = issue.message
      }
    }
  }

  return errors
}
