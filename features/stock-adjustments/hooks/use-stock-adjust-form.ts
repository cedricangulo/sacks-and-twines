"use client"

import { useCallback, useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import {
  type StockAdjustmentFieldErrors,
  type StockAdjustmentFormData,
  validateStockAdjustment,
} from "../validation"
import { useCreateStockAdjustment } from "./use-create-stock-adjustment"

const VALID_REASONS: Record<"add" | "deduct", Set<string>> = {
  add: new Set(["recount", "system_reversal"]),
  deduct: new Set(["damaged", "lost", "recount", "system_reversal"]),
}

export function useStockAdjustForm({
  batchId,
  productId,
  currentQuantity,
  open: openProp,
  onOpenChange,
}: {
  batchId: Id<"batches">
  productId: Id<"products">
  currentQuantity: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const adjustment = useCreateStockAdjustment()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [errors, setErrors] = useState<StockAdjustmentFieldErrors>({})
  const [direction, setDirectionState] = useState<"add" | "deduct">("add")
  const [quantity, setQuantity] = useState<string>("")
  const [reason, setReason] = useState<string>("")

  const setDirection = useCallback((dir: "add" | "deduct") => {
    setDirectionState(dir)
    setReason((prev) => (VALID_REASONS[dir].has(prev) ? prev : ""))
  }, [])

  const qty = Number.parseFloat(quantity) || 0
  const newQuantity =
    direction === "add"
      ? currentQuantity + qty
      : Math.max(0, currentQuantity - qty)

  const isDirty = qty > 0 && reason !== ""

  const reset = () => {
    setDirection("add")
    setQuantity("")
    setReason("")
    setErrors({})
  }

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) reset()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const data: StockAdjustmentFormData = {
      direction,
      quantity: qty,
      reason: reason as StockAdjustmentFormData["reason"],
    }

    const result = validateStockAdjustment(data)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    reset()
    await adjustment.submit(batchId, productId, result.data)
  }

  return {
    open,
    direction,
    quantity,
    reason,
    errors,
    isDirty,
    newQuantity,
    setDirection,
    setQuantity,
    setReason,
    setOpen: handleOpenChange,
    handleSubmit,
  }
}
