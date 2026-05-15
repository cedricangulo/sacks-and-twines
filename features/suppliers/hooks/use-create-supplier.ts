"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { SupplierFormData } from "../validation"

export function useCreateSupplier() {
  const createSupplier = useMutation(api.suppliers.mutations.create)

  const submit = async (data: SupplierFormData) => {
    await sileo
      .promise(createSupplier(data), {
        loading: { title: "Creating supplier..." },
        success: {
          title: "Supplier created",
          description: `${data.companyName} has been added to your suppliers.`,
        },
        error: (err: unknown) => ({
          title: "Failed to create supplier",
          description:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        }),
      })
      .catch(() => {})
  }

  return { submit }
}
