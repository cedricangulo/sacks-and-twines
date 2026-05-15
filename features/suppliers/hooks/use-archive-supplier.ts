"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useArchiveSupplier() {
  const archiveSupplier = useMutation(api.suppliers.mutations.archive)

  const submit = async (supplierId: Id<"suppliers">, companyName: string) => {
    await sileo
      .promise(archiveSupplier({ supplierId }), {
        loading: { title: "Archiving supplier..." },
        success: {
          title: "Supplier archived",
          description: `${companyName} has been archived.`,
        },
        error: (err: unknown) => ({
          title: "Failed to archive supplier",
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
