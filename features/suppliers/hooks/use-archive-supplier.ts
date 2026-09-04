"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

// Calls the Convex archive-supplier mutation with sileo toast feedback.
export function useArchiveSupplier() {
  const archiveSupplier = useMutation(api.suppliers.mutations.archive)

  const submit = async (supplierId: Id<"suppliers">, companyName: string) => {
    play("loading")

    await sileo
      .promise(
        archiveSupplier({ supplierId, userAgent: navigator.userAgent }),
        {
          loading: { title: "Archiving supplier..." },
          success: {
            title: "Supplier archived",
            description: `${companyName} has been archived.`,
          },
          error: (err) => handleConvexError(err, "Failed to archive supplier"),
        }
      )
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
