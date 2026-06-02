"use client"

import { SubmitEvent, useEffect, useReducer, useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { useSupplierOptions } from "@/features/suppliers/hooks/use-suppliers"
import { type BatchUpdateFieldErrors, validateBatchUpdate } from "../validation"
import { useBatchDetail } from "./use-batch-detail"
import { useUpdateBatch } from "./use-update-batch"

// Manages the edit-batch dialog lifecycle: fetches detail on open, validates input, and submits to Convex.
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
  const setOpen = onOpenChange ?? setInternalOpen

  type FormState = {
    formValues: {
      supplierId: string
      quantityReceived: number
      totalProcurementCost: number
    } | null
    dirty: boolean
    errors: BatchUpdateFieldErrors
  }

  type FormAction =
    | {
        type: "open"
        supplierId: string
        quantityReceived: number
        totalProcurementCost: number
      }
    | { type: "setFormValues"; formValues: FormState["formValues"] }
    | { type: "setDirty"; dirty: boolean }
    | { type: "setErrors"; errors: BatchUpdateFieldErrors }
    | { type: "clearFieldError"; field: keyof BatchUpdateFieldErrors }

  const [formState, dispatch] = useReducer(
    (state: FormState, action: FormAction): FormState => {
      switch (action.type) {
        case "open":
          return {
            formValues: {
              supplierId: action.supplierId,
              quantityReceived: action.quantityReceived,
              totalProcurementCost: action.totalProcurementCost,
            },
            dirty: false,
            errors: {},
          }
        case "setFormValues":
          return { ...state, formValues: action.formValues }
        case "setDirty":
          return { ...state, dirty: action.dirty }
        case "setErrors":
          return { ...state, errors: action.errors }
        case "clearFieldError": {
          const next = { ...state.errors }
          delete next[action.field]
          return { ...state, errors: next }
        }
        default:
          return state
      }
    },
    { formValues: null, dirty: false, errors: {} }
  )

  const { formValues, dirty, errors } = formState

  useEffect(() => {
    if (open && detail) {
      dispatch({
        type: "open",
        supplierId: detail.supplierId ?? "",
        quantityReceived: detail.quantityReceived,
        totalProcurementCost: detail.totalProcurementCost,
      })
    }
  }, [open, detail])

  const canEditQuantities = detail?.canEditQuantities ?? true

  const handleChange = (
    field: "supplierId" | "quantityReceived" | "totalProcurementCost",
    value: string | number | undefined
  ) => {
    if (!formValues || !detail) return
    const next = { ...formValues, [field]: value }
    dispatch({ type: "setFormValues", formValues: next })
    dispatch({
      type: "setDirty",
      dirty:
        next.supplierId !== (detail.supplierId ?? "") ||
        next.quantityReceived !== detail.quantityReceived ||
        next.totalProcurementCost !== detail.totalProcurementCost,
    })
    dispatch({ type: "clearFieldError", field })
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch({ type: "setErrors", errors: {} })

    if (!formValues) return

    const result = validateBatchUpdate(formValues)

    if (!result.success) {
      dispatch({ type: "setErrors", errors: result.errors })
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
