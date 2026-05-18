"use client"

import { useEffect, useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { useBatchDetail } from "./use-batch-detail"
import { useVoidBatch } from "./use-void-batch"

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
  const setOpen = onOpenChange ?? setInternalOpen
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (open) setReason("")
  }, [open])

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
