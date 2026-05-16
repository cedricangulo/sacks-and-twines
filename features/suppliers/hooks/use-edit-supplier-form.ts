"use client"

import { SubmitEvent, useState } from "react"
import {
  type Supplier,
  type SupplierFieldErrors,
  type SupplierFormData,
  validateSupplier,
} from "../validation"
import { useUpdateSupplier } from "./use-update-supplier"

export function useEditSupplierForm({
  supplier,
  open: openProp,
  onOpenChange,
}: {
  supplier: Supplier
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const update = useUpdateSupplier()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [errors, setErrors] = useState<SupplierFieldErrors>({})
  const [dirty, setDirty] = useState(false)

  const initialValue: SupplierFormData = {
    companyName: supplier.companyName,
    contactPerson: supplier.contactPerson ?? "",
    contactNumber: supplier.contactNumber ?? "",
    address: supplier.address ?? "",
  }

  const [formValues, setFormValues] = useState(initialValue)

  const handleChange = (field: keyof SupplierFormData, value: string) => {
    setFormValues((prev) => {
      const next = { ...prev, [field]: value }
      setDirty(
        next.companyName !== initialValue.companyName ||
          next.contactPerson !== initialValue.contactPerson ||
          next.contactNumber !== initialValue.contactNumber ||
          next.address !== initialValue.address
      )
      return next
    })
    clearFieldError(field)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const result = validateSupplier(formValues)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    await update.submit(supplier._id, result.data)
  }

  const clearFieldError = (field: keyof SupplierFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  return {
    open,
    setOpen,
    formValues,
    handleChange,
    errors,
    dirty,
    handleSubmit,
  }
}
