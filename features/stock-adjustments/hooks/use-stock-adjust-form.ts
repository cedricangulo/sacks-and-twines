"use client"

import { useCallback, useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { BACKDATE_WINDOW_MS } from "@/convex/lib/constants"
import { formatNumber } from "@/lib/formatters"
import { dateTimeToMs } from "@/lib/form-primitives"
import {
  type StockAdjustmentFieldErrors,
  type StockAdjustmentFormData,
  validateStockAdjustment,
} from "../validation"
import { useCreateStockAdjustment } from "./use-create-stock-adjustment"

// Valid reason values for each adjustment direction, used to preserve the selected reason when switching direction.
const VALID_REASONS: Record<"add" | "deduct", Set<string>> = {
  add: new Set(["recount", "system_reversal"]),
  deduct: new Set(["damaged", "lost", "recount", "system_reversal"]),
}

// Manages the stock adjustment dialog form state: direction, quantity, reason, validation, and submission.
export function useStockAdjustForm({
  batchId,
  productId,
  currentQuantity,
  batchQuantity,
  unitLabel,
  allowDecimal,
  open: openProp,
  onOpenChange,
}: {
  batchId: Id<"batches">
  productId: Id<"products">
  currentQuantity: number
  batchQuantity: number
  unitLabel: string
  allowDecimal?: boolean
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
  const [occurredDate, setOccurredDate] = useState<Date | undefined>(undefined)
  const [occurredTime, setOccurredTime] = useState<string>("")

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
    setOccurredDate(undefined)
    setOccurredTime("")
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
      createdAt: dateTimeToMs(occurredDate, occurredTime),
    }

    const result = validateStockAdjustment(data, { allowDecimal })

    if (!result.success) {
      setErrors(result.errors)
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

    // stock_adjustments.mutations.create clamps with Math.max(0, ...) rather
    // than rejecting, so an over-deduction would be accepted and would write a
    // delta larger than the batch ever held into the audit log.
    if (
      result.data.direction === "deduct" &&
      result.data.quantity > batchQuantity
    ) {
      setErrors({
        quantity: `Only ${formatNumber(batchQuantity)} ${unitLabel} available in this batch`,
      })
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
    occurredDate,
    occurredTime,
    errors,
    isDirty,
    newQuantity,
    setDirection,
    setQuantity,
    setReason,
    setOccurredDate,
    setOccurredTime,
    setOpen: handleOpenChange,
    handleSubmit,
  }
}
