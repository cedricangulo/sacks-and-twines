"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"
import type { ProductUpdateFormData } from "../validation"

// Calls the Convex product update mutation with sileo toast feedback and optional image upload.
export function useUpdateProduct() {
  const updateProduct = useMutation(api.products.mutations.update)

  const submit = async (
    productId: Id<"products">,
    data: ProductUpdateFormData,
    opts?: { imageStorageId?: string | null }
  ) => {
    play("loading")
    await sileo
      .promise(
        updateProduct({
          productId,
          ...data,
          imageStorageId: opts?.imageStorageId,
          userAgent: navigator.userAgent,
        }),
        {
          loading: { title: "Updating product..." },
          success: {
            title: "Product updated",
            description: "Product catalog details have been updated.",
          },
          error: (err) => handleConvexError(err, "Failed to update product"),
        }
      )
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
