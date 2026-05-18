"use client"

import { useQuery } from "convex-helpers/react/cache"
import { SubmitEvent, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
  const suppliers = useQuery(api.suppliers.queries.list, {})
  const update = useUpdateBatch()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [errors, setErrors] = useState<BatchUpdateFieldErrors>({})
  const [dirty, setDirty] = useState(false)

  const supplierOptions =
    suppliers
      ?.filter((s: { archivedAt?: number }) => !s.archivedAt)
      .map((s: { _id: unknown; companyName: string }) => ({
        id: String(s._id),
        name: s.companyName,
      })) ?? []

  const [formValues, setFormValues] = useState<{
    supplierId: string
    quantityReceived: number
    totalProcurementCost: number
  } | null>(null)

  useEffect(() => {
    if (open && detail) {
      setFormValues({
        supplierId: detail.supplierId ?? "",
        quantityReceived: detail.quantityReceived,
        totalProcurementCost: detail.totalProcurementCost,
      })
      setDirty(false)
      setErrors({})
    }
  }, [open, detail])

  const canEditQuantities = detail?.canEditQuantities ?? true

  const handleChange = (
    field: "supplierId" | "quantityReceived" | "totalProcurementCost",
    value: string | number | undefined
  ) => {
    setFormValues((prev) => {
      if (!prev || !detail) return prev
      const next = { ...prev, [field]: value }
      setDirty(
        next.supplierId !== (detail.supplierId ?? "") ||
          next.quantityReceived !== detail.quantityReceived ||
          next.totalProcurementCost !== detail.totalProcurementCost
      )
      return next
    })
    clearFieldError(field)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    if (!formValues) return

    const result = validateBatchUpdate(formValues)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    await update.submit(batchId, detail!.productId, result.data)
  }

  const clearFieldError = (field: keyof BatchUpdateFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
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
