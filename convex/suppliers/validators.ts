import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import {
  contactNumberSchema,
  NAME_ALLOWED,
  normalizedString,
  safeText,
} from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for creating a new supplier.
// `address` stays on `normalizedString`: it is free text, and an allowlist
// would reject ordinary street and unit punctuation.
export const createSupplierArgs = {
  companyName: safeText(2, 255, NAME_ALLOWED),
  contactPerson: safeText(2, 255, NAME_ALLOWED),
  contactNumber: contactNumberSchema,
  address: normalizedString(10, 500),
  ...auditMeta,
}

// Arguments for updating an existing supplier.
export const updateSupplierArgs = {
  supplierId: zid("suppliers"),
  ...createSupplierArgs,
}

// Arguments for archiving a supplier.
export const archiveSupplierArgs = {
  supplierId: zid("suppliers"),
  ...auditMeta,
}

// Arguments for unarchiving a supplier.
export const unarchiveSupplierArgs = {
  supplierId: zid("suppliers"),
  ...auditMeta,
}
