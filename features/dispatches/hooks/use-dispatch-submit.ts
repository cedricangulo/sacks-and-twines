"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { useState } from "react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { BACKDATE_WINDOW_MS } from "@/convex/lib/constants"
import { handleConvexError } from "@/lib/error-handler"
import { dateTimeToMs } from "@/lib/form-primitives"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  type DispatchSubmitFieldErrors,
  validateDispatchSubmit,
} from "../validation"
import { useDispatchQueueContext } from "./dispatch-queue-context"

// Submits the dispatch queue to Convex with sileo toast feedback and customer reference.
export function useDispatchSubmit(onSuccess?: () => void) {
  const { items, itemCount, removeFromQueue, clearQueue } =
    useDispatchQueueContext()
  const submitDispatch = useMutation(api.dispatches.mutations.submit)
  const [customerReference, setCustomerReference] = useState("")
  const [dispatchDate, setDispatchDate] = useState<Date | undefined>(undefined)
  const [dispatchTime, setDispatchTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<DispatchSubmitFieldErrors>({})
  const isMobile = useIsMobile()
  // Sidebar is only visible at xl+, so on mobile the right side is free for
  // bottom-right toasts. Everywhere else use bottom-center to avoid covering
  // the dispatch queue sidebar and its submit button.
  const toastPosition = isMobile ? "bottom-right" : "bottom-center"

  const handleSubmit = async () => {
    if (itemCount === 0) return

    // Validate before mutating so an over-long or malformed reference surfaces
    // on the field instead of failing server-side with the queue still full.
    const payload = {
      customerReference,
      createdAt: dateTimeToMs(dispatchDate, dispatchTime),
      items: items.map((item) => ({
        productId: item.productId as Id<"products">,
        quantity: item.quantity,
        dispatchUom: item.dispatchUom,
      })),
    }
    const result = validateDispatchSubmit(payload)
    if (!result.success) {
      setErrors(result.errors)
      // Item-level errors (`items.0.quantity`) have no field of their own, so
      // without a toast a failing Dispatch click looks like nothing happened.
      // The reference error already renders inline on its field.
      const itemErrorCount = Object.keys(result.errors).filter((key) =>
        key.startsWith("items.")
      ).length
      if (itemErrorCount > 0) {
        sileo.error({
          title: "Check the dispatch queue",
          description:
            itemErrorCount === 1
              ? "One item has an error and needs attention."
              : `${itemErrorCount} items have errors and need attention.`,
          position: toastPosition,
        })
      }
      return
    }
    if (
      result.data.createdAt !== undefined &&
      result.data.createdAt > Date.now()
    ) {
      setErrors({ createdAt: "Date cannot be in the future" })
      return
    }
    if (
      result.data.createdAt !== undefined &&
      result.data.createdAt < Date.now() - BACKDATE_WINDOW_MS
    ) {
      setErrors({ createdAt: "Date cannot be more than 30 days in the past" })
      return
    }
    setErrors({})

    setIsSubmitting(true)
    play("loading")

    await sileo
      .promise(
        submitDispatch({
          customerReference: result.data.customerReference,
          createdAt: result.data.createdAt,
          items: result.data.items,
          userAgent: navigator.userAgent,
        }),
        {
          loading: { title: "Processing dispatch..." },
          success: { title: "Dispatch completed" },
          error: (err) => handleConvexError(err, "Dispatch failed"),
          position: toastPosition,
        }
      )
      .then(() => {
        clearQueue()
        setCustomerReference("")
        setDispatchDate(undefined)
        setDispatchTime("")
        onSuccess?.()
      })
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  // Removing an item shifts every `items.N.*` error key after it, so queued
  // errors are cleared rather than left misattributed to the wrong row.
  const handleRemove = (productId: string) => {
    removeFromQueue(productId)
    setErrors({})
  }

  return {
    items,
    itemCount,
    customerReference,
    setCustomerReference,
    dispatchDate,
    setDispatchDate,
    dispatchTime,
    setDispatchTime,
    isSubmitting,
    errors,
    handleSubmit,
    removeFromQueue: handleRemove,
  }
}
