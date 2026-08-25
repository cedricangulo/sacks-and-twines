"use client"

import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { SubmitEvent, useEffect, useReducer, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DEFAULT_CONVERSION_FACTOR } from "@/convex/lib/constants"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import {
  type ProductUpdateFieldErrors,
  type ProductUpdateFormData,
  validateProductUpdate,
} from "../validation"
import { useUpdateProduct } from "./use-update-product"

/** Max image size (5 MB) — keep in sync with `lib/hooks/use-image-upload.ts`. */
const MAX_FILE_SIZE = 5 * 1024 * 1024
/** MIME filter for the edit-product dropzone. */
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

/** Snapshot of the edit-product dialog. */
type DialogState = {
  /** Validated form fields (null until product detail loads). */
  formValues: ProductUpdateFormData | null
  /** Preview URL — either remote `imageUrl` or local `blob:` URL. */
  imagePreview: string | null
  /** True when user cleared the image (so submit sends `imageStorageId: null`). */
  imageCleared: boolean
  /** Raw file waiting to be uploaded on submit. */
  selectedFile: File | null
  /** Image validation / upload error shown under the dropzone. */
  imageError: string | null
  /** Fields locked because batches exist (`hasBatches`). */
  lockedFields: Record<string, boolean>
  /** Whether user changed anything (enables Save). */
  dirty: boolean
  /** Field-level validation errors. */
  errors: ProductUpdateFieldErrors
}

// Actions that drive the edit-product dialog reducer.
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
      value: string | number | string[] | undefined
    }
  | { type: "selectImage"; file: File | null }
  | { type: "setImageError"; imageError: string | null }
  | { type: "setErrors"; errors: ProductUpdateFieldErrors }
  | { type: "clearFieldError"; field: keyof ProductUpdateFieldErrors }
  | { type: "setLockedFields"; lockedFields: Record<string, boolean> }
  | { type: "setDirty" }

/** Empty dialog state before a product is loaded. */
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

/**
 * State machine for the edit dialog.
 * - `open`: hydrates form from `getEditDetail`.
 * - `changeField` / `setLockedFields` / `setErrors`: form edits.
 * - `selectImage`: stages a file and creates a `blob:` preview (revokes
 *   previous `blob:` URL to avoid leaks).
 */
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
          conversionFactor: action.hasBatches,
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
      // Revoke previous blob preview before replacing — prevents leak when
      // user re-selects files multiple times without clearing.
      if (state.imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(state.imagePreview)
      }
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

/**
 * Lifecycle hook for the Edit Product dialog.
 * - Fetches `getEditDetail` when `open` is true.
 * - Exposes `formValues`, `imagePreview`, `handleChange`, `handleImageSelect`,
 *   `handleSubmit` (validates → uploads image to Convex storage with `ok` +
 *   `storageId` checks → `update.submit`).
 */
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
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const detail = useQuery(
    api.products.queries.getEditDetail,
    isAuthenticated && open ? { productId } : "skip"
  )
  const update = useUpdateProduct()
  const generateUploadUrl = useMutation(api.batches.mutations.generateUploadUrl)
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

  // Cleanup: revoke the active blob preview when the hook unmounts or when
  // `imagePreview` changes (covers the "cancel without clear" case).
  useEffect(() => {
    return () => {
      if (dialogState.imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(dialogState.imagePreview)
      }
    }
  }, [dialogState.imagePreview])

  useEffect(() => {
    if (open && detail) {
      dispatch({
        type: "open",
        formValues: {
          name: detail.name,
          category: detail.category,
          baseUom: detail.baseUom,
          conversionFactor:
            detail.conversionFactor ??
            DEFAULT_CONVERSION_FACTOR[detail.category] ??
            0,
          lowStockThreshold: detail.lowStockThreshold ?? 0,
          keywords: detail.keywords ?? [],
        },
        imagePreview: detail.imageUrl ?? null,
        hasBatches,
      })
    }
  }, [open, detail, hasBatches])

  /**
   * Stage an image for the dialog.
   * - Validates type/size → `imageError`.
   * - `file === null` → revokes current `blob:` preview (keeps remote URLs
   *   untouched) and marks `imageCleared`.
   * - Delegates actual `blob:` creation to the reducer so revoke happens
   *   exactly once per transition.
   */
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
    } else if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }
    dispatch({ type: "selectImage", file })
  }

  const handleChange = (
    field: keyof ProductUpdateFormData,
    value: string | number | string[] | undefined
  ) => {
    dispatch({ type: "changeField", field, value })
  }

  const handleUnlock = (field: string) => {
    dispatch({
      type: "setLockedFields",
      lockedFields: { ...lockedFields, [field]: false },
    })
  }

  /**
   * Validate, optionally upload the staged image, then persist the product.
   * Image handling:
   * - `selectedFile` → POST to Convex upload URL, require `res.ok` and a
   *   non-empty `storageId`, else show `imageError` and abort.
   * - `imageCleared` → `imageStorageId = null` (remove image).
   * - neither → `undefined` (keep existing image).
   */
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
        if (!uploadResult.ok) {
          throw new Error(`Upload failed: ${uploadResult.status}`)
        }
        const body = (await uploadResult.json()) as { storageId?: unknown }
        if (typeof body.storageId !== "string" || body.storageId.length === 0) {
          throw new Error("Missing storageId in upload response")
        }
        imageStorageId = body.storageId
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
