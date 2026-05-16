"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { sileoRateLimitError } from "@/lib/rate-limit-error"

export function useVoidBatch() {
  const voidBatch = useMutation(api.batches.mutations.voidBatch)

  const submit = async (batchId: Id<"batches">, reason?: string) => {
    await sileo
      .promise(voidBatch({ batchId, reason, userAgent: navigator.userAgent }), {
        loading: { title: "Voiding batch..." },
        success: {
          title: "Batch voided",
          description: reason
            ? `Batch voided. Reason: ${reason}`
            : "Batch has been voided.",
        },
        error: (err) => sileoRateLimitError(err, "Failed to void batch"),
      })
      .catch(() => {})
  }

  return { submit }
}
