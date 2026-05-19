"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

export function useArchiveProduct() {
  const archiveProduct = useMutation(api.products.mutations.archive)

  const submit = async (productId: Id<"products">, productName: string) => {
    await sileo
      .promise(archiveProduct({ productId, userAgent: navigator.userAgent }), {
        loading: { title: "Archiving product..." },
        success: {
          title: "Product archived",
          description: `${productName} has been archived.`,
        },
        error: (err) => handleConvexError(err, "Failed to archive product"),
      })
      .catch(() => {})
  }

  return { submit }
}

export function useUnarchiveProduct() {
  const unarchiveProduct = useMutation(api.products.mutations.unarchive)

  const submit = async (productId: Id<"products">, productName: string) => {
    await sileo
      .promise(
        unarchiveProduct({ productId, userAgent: navigator.userAgent }),
        {
          loading: { title: "Unarchiving product..." },
          success: {
            title: "Product restored",
            description: `${productName} has been restored to active use.`,
          },
          error: (err) => handleConvexError(err, "Failed to unarchive product"),
        }
      )
      .catch(() => {})
  }

  return { submit }
}
