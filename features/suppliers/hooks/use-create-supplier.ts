"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { handleConvexError } from "@/lib/error-handler"
import type { SupplierFormData } from "../validation"

// Calls the Convex create-supplier mutation with sileo toast feedback.
export function useCreateSupplier() {
  const createSupplier = useMutation(api.suppliers.mutations.create)

  const submit = async (data: SupplierFormData) => {
    play("loading")

    await sileo
      .promise(createSupplier({ ...data, userAgent: navigator.userAgent }), {
        loading: { title: "Creating supplier..." },
        success: {
          title: "Supplier created",
          description: `${data.companyName} has been added to your suppliers.`,
        },
        error: (err) => handleConvexError(err, "Failed to create supplier"),
      })
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
