import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { normalizedString } from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for creating a new staff user.
export const createUserArgs = {
  name: normalizedString(1, 255),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters"),
  ...auditMeta,
}

// Arguments for deactivating a staff user.
export const deactivateUserArgs = {
  userId: zid("users"),
  ...auditMeta,
}

// Arguments for reactivating a staff user.
export const activateUserArgs = {
  userId: zid("users"),
  ...auditMeta,
}
