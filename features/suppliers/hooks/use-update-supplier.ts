"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { sileoRateLimitError } from "@/lib/rate-limit-error"
import type { SupplierFormData } from "../validation"

export function useUpdateSupplier() {
  const updateSupplier = useMutation(api.suppliers.mutations.update)

  const submit = async (
    supplierId: Id<"suppliers">,
    data: SupplierFormData
  ) => {
    await sileo
      .promise(
        updateSupplier({ supplierId, ...data, userAgent: navigator.userAgent }),
        {
          loading: { title: "Updating supplier..." },
          success: {
            title: "Supplier updated",
            description: `${data.companyName} has been updated.`,
          },
          error: (err) => {
            if (err instanceof Error && err.message.includes("company name already exists")) {
              return {
                title: "Duplicate supplier",
                description: `"${data.companyName}" is already registered.`,
              }
            }
            return sileoRateLimitError(err, "Failed to update supplier")
          },
        }
      )
      .catch(() => {})
  }

  return { submit }
}
