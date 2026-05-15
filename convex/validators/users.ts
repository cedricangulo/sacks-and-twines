import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { normalizedString } from "./helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

export const createUserArgs = {
  name: normalizedString(1, 255),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters"),
  ...auditMeta,
}

export const deactivateUserArgs = {
  userId: zid("users"),
  ...auditMeta,
}
