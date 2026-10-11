"use client"

import { useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { type VoidBatchFieldErrors, validateVoidBatch } from "../validation"
import { useBatchDetail } from "./use-batch-detail"
import { useVoidBatch } from "./use-void-batch"

// Manages the void-batch dialog state: fetches batch detail, tracks reason input, and handles submission.
export function useVoidBatchDialog({
  batchId,
  open: openProp,
  onOpenChange,
}: {
  batchId: Id<"batches">
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const detail = useBatchDetail(batchId)
  const voidBatch = useVoidBatch()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<VoidBatchFieldErrors>({})

  const setOpen = (val: boolean) => {
    if (!val) {
      setReason("")
      setErrors({})
    }
    if (onOpenChange !== undefined) {
      onOpenChange(val)
    } else {
      setInternalOpen(val)
    }
  }

  const handleVoid = async () => {
    // Validate before mutating. The dialog used to close before awaiting the
    // mutation, so a rejected submit discarded whatever the operator typed.
    const result = validateVoidBatch({ reason })
    if (!result.success) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    await voidBatch.submit(batchId, result.data.reason)
    setOpen(false)
  }

  return {
    detail,
    open,
    setOpen,
    reason,
    setReason,
    errors,
    handleVoid,
  }
}
