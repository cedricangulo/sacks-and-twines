"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { sileoRateLimitError } from "@/lib/rate-limit-error"
import type { BatchUpdateFormData } from "../validation"

export function useUpdateBatch() {
  const updateBatch = useMutation(api.batches.mutations.update)

  const submit = async (
    batchId: Id<"batches">,
    productId: Id<"products">,
    data: BatchUpdateFormData
  ) => {
    await sileo
      .promise(
        updateBatch({
          batchId,
          productId,
          ...data,
          userAgent: navigator.userAgent,
        }),
        {
          loading: { title: "Updating batch..." },
          success: {
            title: "Batch updated",
            description: `Batch has been updated.`,
          },
          error: (err) => sileoRateLimitError(err, "Failed to update batch"),
        }
      )
      .catch(() => {})
  }

  return { submit }
}
