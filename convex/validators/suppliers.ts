import { zid } from "convex-helpers/server/zod4"
import { z } from "zod"
import { contactNumberSchema, normalizedString } from "./helpers"

const auditMeta = {
  userAgent: z.optional(z.string()),
}

export const createSupplierArgs = {
  companyName: normalizedString(2, 255),
  contactPerson: normalizedString(2, 255),
  contactNumber: contactNumberSchema,
  address: normalizedString(10, 500),
  ...auditMeta,
}

export const updateSupplierArgs = {
  supplierId: zid("suppliers"),
  ...createSupplierArgs,
}

export const archiveSupplierArgs = {
  supplierId: zid("suppliers"),
  ...auditMeta,
}

export const unarchiveSupplierArgs = {
  supplierId: zid("suppliers"),
  ...auditMeta,
}
