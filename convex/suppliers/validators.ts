import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { contactNumberSchema, normalizedString } from "../validators/helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

// Arguments for creating a new supplier.
export const createSupplierArgs = {
  companyName: normalizedString(2, 255),
  contactPerson: normalizedString(2, 255),
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
