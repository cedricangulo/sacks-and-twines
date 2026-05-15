"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { sileoRateLimitError } from "@/lib/rate-limit-error"
import type { SupplierFormData } from "../validation"

export function useCreateSupplier() {
  const createSupplier = useMutation(api.suppliers.mutations.create)

  const submit = async (data: SupplierFormData) => {
    await sileo
      .promise(createSupplier({ ...data, userAgent: navigator.userAgent }), {
        loading: { title: "Creating supplier..." },
        success: {
          title: "Supplier created",
          description: `${data.companyName} has been added to your suppliers.`,
        },
        error: (err) => sileoRateLimitError(err, "Failed to create supplier"),
      })
      .catch(() => {})
  }

  return { submit }
}
