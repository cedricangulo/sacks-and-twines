import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { NAME_ALLOWED, safeText } from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for creating a new staff user.
export const createUserArgs = {
  name: safeText(1, 255, NAME_ALLOWED),
  email: z.email("Enter a valid email address.").max(254, "Email is too long"),
  // `.max` bounds the scrypt hashing cost: scrypt is intentionally slow, so an
  // unbounded password body is a cheap CPU lever.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
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
