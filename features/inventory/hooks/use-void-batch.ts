"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

// Calls the Convex void-batch mutation with sileo toast feedback.
export function useVoidBatch() {
  const voidBatch = useMutation(api.batches.mutations.voidBatch)

  const submit = async (batchId: Id<"batches">, reason?: string) => {
    play("loading")

    await sileo
      .promise(voidBatch({ batchId, reason, userAgent: navigator.userAgent }), {
        loading: { title: "Voiding batch..." },
        success: {
          title: "Batch voided",
          description: reason
            ? `Batch voided. Reason: ${reason}`
            : "Batch has been voided.",
        },
        error: (err) => handleConvexError(err, "Failed to void batch"),
      })
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
