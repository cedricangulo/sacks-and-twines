"use client"

import { SubmitEvent, useReducer, useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { useSupplierOptions } from "@/features/suppliers/hooks/use-suppliers"
import { type BatchUpdateFieldErrors, validateBatchUpdate } from "../validation"
import { useBatchDetail } from "./use-batch-detail"
import { useUpdateBatch } from "./use-update-batch"

export function useEditBatchForm({
  batchId,
  open: openProp,
  onOpenChange,
}: {
  batchId: Id<"batches">
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const detail = useBatchDetail(batchId)
  const supplierOptions = useSupplierOptions() ?? []
  const update = useUpdateBatch()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen)
      return
    }
    setInternalOpen(nextOpen)
  }

  type FormState = {
    initKey: string
    formValues: {
      supplierId: string
      quantityReceived: number
      totalProcurementCost: number
    } | null
    dirty: boolean
    errors: BatchUpdateFieldErrors
  }

  const [formState, setFormState] = useState<FormState>(() => ({
    initKey: open && detail ? batchId : "closed",
    formValues:
      open && detail
        ? {
            supplierId: detail.supplierId ?? "",
            quantityReceived: detail.quantityReceived,
            totalProcurementCost: detail.totalProcurementCost,
          }
        : null,
    dirty: false,
    errors: {},
  }))

  const initKey = open ? (detail ? batchId : `loading:${batchId}`) : "closed"

  if (formState.initKey !== initKey) {
    setFormState({
      initKey,
      formValues:
        open && detail
          ? {
              supplierId: detail.supplierId ?? "",
              quantityReceived: detail.quantityReceived,
              totalProcurementCost: detail.totalProcurementCost,
            }
          : null,
      dirty: false,
      errors: {},
    })
  }

  const { formValues, dirty, errors } = formState

  const canEditQuantities = detail?.canEditQuantities ?? true

  const handleChange = (
    field: "supplierId" | "quantityReceived" | "totalProcurementCost",
    value: string | number | undefined
  ) => {
    if (!formValues || !detail) return
    const next = { ...formValues, [field]: value }
    setFormState((prev) => ({
      ...prev,
      formValues: next,
      dirty:
        next.supplierId !== (detail.supplierId ?? "") ||
        next.quantityReceived !== detail.quantityReceived ||
        next.totalProcurementCost !== detail.totalProcurementCost,
      errors: Object.fromEntries(
        Object.entries(prev.errors).filter(([key]) => key !== field)
      ) as BatchUpdateFieldErrors,
    }))
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormState((prev) => ({ ...prev, errors: {} }))

    if (!formValues) return

    const result = validateBatchUpdate(formValues)

    if (!result.success) {
      setFormState((prev) => ({ ...prev, errors: result.errors }))
      return
    }

    setOpen(false)
    await update.submit(batchId, detail!.productId, result.data)
  }

  return {
    detail,
    open,
    setOpen,
    formValues,
    supplierOptions,
    errors,
    dirty,
    canEditQuantities,
    handleChange,
    handleSubmit,
  }
}
