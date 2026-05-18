"use client"

import { useConvexAuth, useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { SubmitEvent, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  type ProductUpdateFieldErrors,
  type ProductUpdateFormData,
  validateProductUpdate,
} from "../validation"
import { useUpdateProduct } from "./use-update-product"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

export function useEditProductForm({
  productId,
  open: openProp,
  onOpenChange,
}: {
  productId: Id<"products">
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { isAuthenticated } = useConvexAuth()
  const detail = useQuery(
    api.products.queries.getEditDetail,
    isAuthenticated ? { productId } : "skip"
  )
  const update = useUpdateProduct()
  const generateUploadUrl = useMutation(api.batches.mutations.generateUploadUrl)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [errors, setErrors] = useState<ProductUpdateFieldErrors>({})
  const [imageError, setImageError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({})

  const [formValues, setFormValues] = useState<ProductUpdateFormData | null>(
    null
  )

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageCleared, setImageCleared] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const hasBatches = (detail?.batchCount ?? 0) > 0

  useEffect(() => {
    if (open && detail) {
      setFormValues({
        name: detail.name,
        category: detail.category,
        baseUom: detail.baseUom,
        weightPerUnit:
          detail.weightPerUnit ?? (detail.category === "sacks" ? 0 : 20),
        lowStockThreshold: detail.lowStockThreshold ?? 0,
      })
      setImagePreview(detail.imageUrl ?? null)
      setImageCleared(false)
      setSelectedFile(null)
      setImageError(null)
      setLockedFields({
        category: hasBatches,
        baseUom: hasBatches,
        weightPerUnit: hasBatches,
      })
      setDirty(false)
      setErrors({})
    }
  }, [open, detail, hasBatches])

  const handleImageSelect = (file: File | null) => {
    setImageError(null)
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError("Only JPEG and PNG files are allowed.")
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setImageError("File size must be under 5MB.")
        return
      }
      setImagePreview(URL.createObjectURL(file))
      setSelectedFile(file)
      setImageCleared(false)
    } else {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
      setSelectedFile(null)
      setImageCleared(true)
    }
    setDirty(true)
  }

  const handleChange = (
    field: keyof ProductUpdateFormData,
    value: string | number | undefined
  ) => {
    setFormValues((prev) => {
      if (!prev || !detail) return prev
      const next = { ...prev, [field]: value }
      setDirty(true)
      return next
    })
    clearFieldError(field)
  }

  const handleUnlock = (field: string) => {
    setLockedFields((prev) => ({ ...prev, [field]: false }))
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setImageError(null)

    if (!formValues) return

    const result = validateProductUpdate(formValues)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    let imageStorageId: string | null | undefined

    if (selectedFile) {
      try {
        const postUrl = await generateUploadUrl()
        const uploadResult = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })
        const { storageId } = await uploadResult.json()
        imageStorageId = storageId as string
      } catch {
        setImageError("Failed to upload image. Please try again.")
        return
      }
    } else if (imageCleared) {
      imageStorageId = null
    } else {
      imageStorageId = undefined
    }

    setOpen(false)
    await update.submit(productId, result.data, { imageStorageId })
  }

  const clearFieldError = (field: keyof ProductUpdateFieldErrors) => {
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
    errors,
    imageError,
    dirty,
    lockedFields,
    hasBatches,
    imagePreview,
    handleChange,
    handleUnlock,
    handleSubmit,
    handleImageSelect,
  }
}
