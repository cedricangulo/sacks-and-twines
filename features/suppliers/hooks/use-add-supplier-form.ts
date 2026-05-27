"use client"

import { SubmitEvent, useState } from "react"
import {
  type SupplierFieldErrors,
  type SupplierFormData,
  validateSupplier,
} from "../validation"
import { useCreateSupplier } from "./use-create-supplier"

/** Manages the add-supplier dialog form state: fields, validation, and submission. */
export function useAddSupplierForm() {
  const create = useCreateSupplier()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<SupplierFieldErrors>({})

  const initialValue: SupplierFormData = {
    companyName: "",
    contactPerson: "",
    contactNumber: "",
    address: "",
  }

  const [formValues, setFormValues] = useState(initialValue)

  const handleChange = (field: keyof SupplierFormData, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
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
    setFormValues(initialValue)
    await create.submit(result.data)
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
    handleSubmit,
  }
}
