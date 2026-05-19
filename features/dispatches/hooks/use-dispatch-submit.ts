"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"
import { useDispatchQueueContext } from "./dispatch-queue-context"

export function useDispatchSubmit(onSuccess?: () => void) {
  const { items, itemCount, removeFromQueue, clearQueue } =
    useDispatchQueueContext()
  const submitDispatch = useMutation(api.dispatches.mutations.submit)
  const [customerReference, setCustomerReference] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (itemCount === 0) return

    setIsSubmitting(true)
    await sileo
      .promise(
        submitDispatch({
          customerReference: customerReference || undefined,
          items: items.map((item) => ({
            productId: item.productId as Id<"products">,
            quantity: item.quantity,
            dispatchUom: item.dispatchUom,
          })),
          userAgent: navigator.userAgent,
        }),
        {
          loading: { title: "Processing dispatch..." },
          success: { title: "Dispatch completed" },
          error: (err) => handleConvexError(err, "Dispatch failed"),
        }
      )
      .then(() => {
        clearQueue()
        setCustomerReference("")
        onSuccess?.()
      })
      .catch(() => {})
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  return {
    items,
    itemCount,
    customerReference,
    setCustomerReference,
    isSubmitting,
    handleSubmit,
    removeFromQueue,
  }
}
