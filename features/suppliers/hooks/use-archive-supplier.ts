"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { sileoRateLimitError } from "@/lib/rate-limit-error"

export function useArchiveSupplier() {
  const archiveSupplier = useMutation(api.suppliers.mutations.archive)

  const submit = async (supplierId: Id<"suppliers">, companyName: string) => {
    await sileo
      .promise(
        archiveSupplier({ supplierId, userAgent: navigator.userAgent }),
        {
          loading: { title: "Archiving supplier..." },
          success: {
            title: "Supplier archived",
            description: `${companyName} has been archived.`,
          },
          error: (err) =>
            sileoRateLimitError(err, "Failed to archive supplier"),
        }
      )
      .catch(() => {})
  }

  return { submit }
}
