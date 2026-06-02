"use client"

import { useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
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

  const setOpen = (val: boolean) => {
    if (val) setReason("")
    if (onOpenChange !== undefined) {
      onOpenChange(val)
    } else {
      setInternalOpen(val)
    }
  }

  const handleVoid = async () => {
    setOpen(false)
    await voidBatch.submit(batchId, reason || undefined)
  }

  return {
    detail,
    open,
    setOpen,
    reason,
    setReason,
    handleVoid,
  }
}
