"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

// Calls the Convex archive mutation with sileo toast feedback.
export function useArchiveProduct() {
  const archiveProduct = useMutation(api.products.mutations.archive)

  const submit = async (productId: Id<"products">, productName: string) => {
    play("loading")
    await sileo
      .promise(archiveProduct({ productId, userAgent: navigator.userAgent }), {
        loading: { title: "Archiving product..." },
        success: {
          title: "Product archived",
          description: `${productName} has been archived.`,
        },
        error: (err) => handleConvexError(err, "Failed to archive product"),
      })
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}

// Calls the Convex unarchive mutation with sileo toast feedback.
export function useUnarchiveProduct() {
  const unarchiveProduct = useMutation(api.products.mutations.unarchive)

  const submit = async (productId: Id<"products">, productName: string) => {
    play("loading")
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
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
