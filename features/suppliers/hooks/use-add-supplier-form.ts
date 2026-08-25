"use client"

import { SubmitEvent, useState } from "react"
import {
  type SupplierFieldErrors,
  type SupplierFormData,
  validateSupplier,
} from "../validation"
import { useCreateSupplier } from "./use-create-supplier"

/**
 * Empty form — hoisted to module scope so it’s not re-created on every render.
 * Fixes `react-doctor/prefer-module-scope-static-value` and keeps `setFormValues(INITIAL_VALUE)` stable.
 */
const INITIAL_VALUE: SupplierFormData = {
  companyName: "",
  contactPerson: "",
  contactNumber: "",
  address: "",
}

/** Dialog state for creating a supplier. Holds `formValues`, field `errors`, and `open` toggle. */
export function useAddSupplierForm() {
  const create = useCreateSupplier()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<SupplierFieldErrors>({})

  const [formValues, setFormValues] = useState(INITIAL_VALUE)

  /** Update a single field and clear its error. */
  const handleChange = (field: keyof SupplierFormData, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    clearFieldError(field)
  }

  /** Validate with `validateSupplier`, reset to `INITIAL_VALUE` on success, then call `create.submit`. */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const result = validateSupplier(formValues)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    setFormValues(INITIAL_VALUE)
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
