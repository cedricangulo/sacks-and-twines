"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { sileoRateLimitError } from "@/lib/rate-limit-error"

export function useUnarchiveSupplier() {
  const unarchiveSupplier = useMutation(api.suppliers.mutations.unarchive)

  const submit = async (supplierId: Id<"suppliers">, companyName: string) => {
    await sileo
      .promise(
        unarchiveSupplier({ supplierId, userAgent: navigator.userAgent }),
        {
          loading: { title: "Unarchiving supplier..." },
          success: {
            title: "Supplier restored",
            description: `${companyName} has been restored to active use.`,
          },
          error: (err) => {
            return sileoRateLimitError(err, "Failed to unarchive supplier")
          },
        }
      )
      .catch(() => {})
  }

  return { submit }
}
