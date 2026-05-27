"use client"

import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { SubmitEvent, useEffect, useReducer, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import {
  type ProductUpdateFieldErrors,
  type ProductUpdateFormData,
  validateProductUpdate,
} from "../validation"
import { useUpdateProduct } from "./use-update-product"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

/** Current state of the edit-product dialog. */
type DialogState = {
  formValues: ProductUpdateFormData | null
  imagePreview: string | null
  imageCleared: boolean
  selectedFile: File | null
  imageError: string | null
  lockedFields: Record<string, boolean>
  dirty: boolean
  errors: ProductUpdateFieldErrors
}

/** Actions that drive the edit-product dialog reducer. */
type DialogAction =
  | {
      type: "open"
      formValues: ProductUpdateFormData
      imagePreview: string | null
      hasBatches: boolean
    }
  | {
      type: "changeField"
      field: keyof ProductUpdateFormData
      value: string | number | undefined
    }
  | { type: "selectImage"; file: File | null }
  | { type: "setImageError"; imageError: string | null }
  | { type: "setErrors"; errors: ProductUpdateFieldErrors }
  | { type: "clearFieldError"; field: keyof ProductUpdateFieldErrors }
  | { type: "setLockedFields"; lockedFields: Record<string, boolean> }
  | { type: "setDirty" }

/** Default state for the edit-product reducer. */
const INITIAL_DIALOG_STATE: DialogState = {
  formValues: null,
  imagePreview: null,
  imageCleared: false,
  selectedFile: null,
  imageError: null,
  lockedFields: {},
  dirty: false,
  errors: {},
}

/** Reducer managing edit-product dialog state: form values, validation errors, image upload, locked fields. */
function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "open":
      return {
        formValues: action.formValues,
        imagePreview: action.imagePreview,
        imageCleared: false,
        selectedFile: null,
        imageError: null,
        lockedFields: {
          category: action.hasBatches,
          baseUom: action.hasBatches,
          weightPerUnit: action.hasBatches,
        },
        dirty: false,
        errors: {},
      }
    case "changeField": {
      if (!state.formValues) return state
      const next = { ...state.formValues, [action.field]: action.value }
      const errors = { ...state.errors }
      delete errors[action.field]
      return { ...state, formValues: next, dirty: true, errors }
    }
    case "selectImage": {
      const next = {
        imagePreview: null,
        selectedFile: null,
        imageCleared: false,
        dirty: true,
      }
      if (action.file) {
        return {
          ...state,
          ...next,
          imagePreview: URL.createObjectURL(action.file),
          selectedFile: action.file,
          imageError: null,
        }
      }
      return { ...state, ...next, imageCleared: true, imageError: null }
    }
    case "setImageError":
      return { ...state, imageError: action.imageError }
    case "setErrors":
      return { ...state, errors: action.errors }
    case "clearFieldError": {
      const next = { ...state.errors }
      delete next[action.field]
      return { ...state, errors: next }
    }
    case "setLockedFields":
      return { ...state, lockedFields: action.lockedFields }
    case "setDirty":
      return { ...state, dirty: true }
    default:
      return state
  }
}

/** Manages the edit-product dialog lifecycle: fetches detail on open, validates input, handles image upload, and submits to Convex. */
export function useEditProductForm({
  productId,
  open: openProp,
  onOpenChange,
}: {
  productId: Id<"products">
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { isAuthenticated } = useCurrentUser()
  const detail = useQuery(
    api.products.queries.getEditDetail,
    isAuthenticated ? { productId } : "skip"
  )
  const update = useUpdateProduct()
  const generateUploadUrl = useMutation(api.batches.mutations.generateUploadUrl)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [dialogState, dispatch] = useReducer(
    dialogReducer,
    INITIAL_DIALOG_STATE
  )
  const {
    formValues,
    imagePreview,
    imageCleared,
    selectedFile,
    imageError,
    lockedFields,
    dirty,
    errors,
  } = dialogState

  const hasBatches = (detail?.batchCount ?? 0) > 0

  useEffect(() => {
    if (open && detail) {
      dispatch({
        type: "open",
        formValues: {
          name: detail.name,
          category: detail.category,
          baseUom: detail.baseUom,
          weightPerUnit:
            detail.weightPerUnit ?? (detail.category === "sacks" ? 0 : 20),
          lowStockThreshold: detail.lowStockThreshold ?? 0,
        },
        imagePreview: detail.imageUrl ?? null,
        hasBatches,
      })
    }
  }, [open, detail, hasBatches])

  const handleImageSelect = (file: File | null) => {
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        dispatch({
          type: "setImageError",
          imageError: "Only JPEG and PNG files are allowed.",
        })
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        dispatch({
          type: "setImageError",
          imageError: "File size must be under 5MB.",
        })
        return
      }
    } else if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    dispatch({ type: "selectImage", file })
  }

  const handleChange = (
    field: keyof ProductUpdateFormData,
    value: string | number | undefined
  ) => {
    dispatch({ type: "changeField", field, value })
  }

  const handleUnlock = (field: string) => {
    dispatch({
      type: "setLockedFields",
      lockedFields: { ...lockedFields, [field]: false },
    })
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch({ type: "setErrors", errors: {} })
    dispatch({ type: "setImageError", imageError: null })

    if (!formValues) return

    const result = validateProductUpdate(formValues)

    if (!result.success) {
      dispatch({ type: "setErrors", errors: result.errors })
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
        dispatch({
          type: "setImageError",
          imageError: "Failed to upload image. Please try again.",
        })
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
