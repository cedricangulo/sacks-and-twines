"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"
import type { SupplierFormData } from "../validation"

// Calls the Convex update-supplier mutation with sileo toast feedback.
export function useUpdateSupplier() {
  const updateSupplier = useMutation(api.suppliers.mutations.update)

  const submit = async (
    supplierId: Id<"suppliers">,
    data: SupplierFormData
  ) => {
    play("loading")

    await sileo
      .promise(
        updateSupplier({ supplierId, ...data, userAgent: navigator.userAgent }),
        {
          loading: { title: "Updating supplier..." },
          success: {
            title: "Supplier updated",
            description: `${data.companyName} has been updated.`,
          },
          error: (err) => handleConvexError(err, "Failed to update supplier"),
        }
      )
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
