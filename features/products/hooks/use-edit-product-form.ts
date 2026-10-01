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
  /**
   * Product the current `formValues` were hydrated from. Cleared on close so
   * the next open refetches in the background, but `formValues` itself is
   * deliberately kept — that is what lets a reopened dialog paint instantly
   * instead of flashing a spinner.
   */
  hydratedFor: Id<"products"> | null
  /** Preview URL — either remote `imageUrl` or local `blob:` URL. */
  imagePreview: string | null
  /**
   * Last known *persisted* image (from the row seed or `getEditDetail`).
   * `close` restores this into `imagePreview`, so reopening never shows a
   * discarded `blob:` upload or a falsely-empty dropzone — both would be
   * lies, since `selectedFile`/`imageCleared` are cleared and a submit would
   * send `imageStorageId: undefined` (keep existing).
   *
   * Known staleness: this is not refreshed after a successful upload, because
   * the new URL lives in Convex storage and the client cannot derive it. So
   * save-a-new-image → close → reopen shows the *previous* image for one paint
   * until the `getEditDetail` hydration lands. Self-correcting, not a wrong
   * end state.
   */
  persistedPreview: string | null
  /** True when user cleared the image (so submit sends `imageStorageId: null`). */
  imageCleared: boolean
  /** Raw file waiting to be uploaded on submit. */
  selectedFile: File | null
  /** Image validation / upload error shown under the dropzone. */
  imageError: string | null
  /** Fields locked because batches exist (`hasBatches`). */
  lockedFields: Record<string, boolean>
  /**
   * Whether the product has stock records. Lives in state (not derived from
   * `detail`) so the "fields are locked" banner is correct on the very first
   * paint instead of popping in once the refresh lands.
   *
   * Seeded from the row's denormalized `batchCount`, which is `undefined` on
   * products created before `backfillProductBatchCounts` — those seed as
   * unlocked. `getEditDetail` corrects it on hydration (it falls back to
   * counting `batches.by_product`), and the server enforces the same rule in
   * `products.mutations.update`, so a stale seed can only produce editable
   * fields plus a rejected submit, never a bad write.
   */
  hasBatches: boolean
  /** Whether user changed anything (enables Save). */
  dirty: boolean
  /** Field-level validation errors. */
  errors: ProductUpdateFieldErrors
}

// Actions that drive the edit-product dialog reducer.
type DialogAction =
  | {
      type: "open"
      productId: Id<"products">
      formValues: ProductUpdateFormData
      imagePreview: string | null
      hasBatches: boolean
    }
  | { type: "close" }
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
  hydratedFor: null,
  imagePreview: null,
  persistedPreview: null,
  imageCleared: false,
  selectedFile: null,
  imageError: null,
  lockedFields: {},
  hasBatches: false,
  dirty: false,
  errors: {},
}

/**
 * Fields `buildFormValues` reads. Structural rather than a named type so both
 * the inventory row (`Product`) and the `getEditDetail` return shape satisfy
 * it without a cast.
 */
type EditableProductFields = {
  name: string
  category: "sacks" | "twines" | "thread"
  baseUom: "piece" | "roll" | "meter"
  conversionFactor?: number
  lowStockThreshold?: number
  keywords?: string[]
  /** Used only for `hasBatches` locking, not by `buildFormValues`. */
  batchCount?: number
  /** Used only for the dropzone preview, not by `buildFormValues`. */
  imageUrl?: string
}

/**
 * Single mapper used by BOTH the row seed and the `getEditDetail` refresh.
 * Sharing it matters: two copies would let the seeded `conversionFactor`
 * disagree with the refreshed one, and the field would visibly snap on open.
 */
function buildFormValues(source: EditableProductFields): ProductUpdateFormData {
  return {
    name: source.name,
    category: source.category,
    baseUom: source.baseUom,
    conversionFactor:
      source.conversionFactor ??
      DEFAULT_CONVERSION_FACTOR[source.category] ??
      0,
    lowStockThreshold: source.lowStockThreshold ?? 0,
    keywords: source.keywords ?? [],
  }
}

/**
 * Category, UoM and conversion factor are locked once a product has stock
 * records. Single source so the row seed and the `getEditDetail` refresh can
 * never disagree about which fields are locked.
 */
function lockedFieldsFor(hasBatches: boolean): Record<string, boolean> {
  return {
    category: hasBatches,
    baseUom: hasBatches,
    conversionFactor: hasBatches,
  }
}

/**
 * Seed the dialog from the inventory row it was opened from.
 *
 * The inventory list query already returns every field this form needs
 * (`convex/products/queries.ts` returns `{ ...product, imageUrl }`, and
 * `batchCount` is a schema field inside that spread), so the form can paint
 * synchronously instead of waiting on a query — that is what removes the
 * first-open spinner.
 *
 * `hydratedFor` stays `null` so the first open still runs `getEditDetail`,
 * which remains the authoritative refresh and keeps the owner auth re-check
 * plus the legacy `batchCount` fallback. It is simply off the critical path
 * for first paint.
 */
function initialDialogState(product: EditableProductFields): DialogState {
  const hasBatches = (product.batchCount ?? 0) > 0
  return {
    ...INITIAL_DIALOG_STATE,
    formValues: buildFormValues(product),
    imagePreview: product.imageUrl ?? null,
    persistedPreview: product.imageUrl ?? null,
    hasBatches,
    lockedFields: lockedFieldsFor(hasBatches),
  }
}

/**
 * State machine for the edit dialog.
 * - `open`: hydrates form from `getEditDetail`.
 * - `close`: marks the snapshot stale without discarding it.
 * - `changeField` / `setLockedFields` / `setErrors`: form edits.
 * - `selectImage`: stages a file and creates a `blob:` preview (revokes
 *   previous `blob:` URL to avoid leaks).
 */
function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "open":
      return {
        formValues: action.formValues,
        hydratedFor: action.productId,
        imagePreview: action.imagePreview,
        persistedPreview: action.imagePreview,
        imageCleared: false,
        selectedFile: null,
        imageError: null,
        hasBatches: action.hasBatches,
        lockedFields: lockedFieldsFor(action.hasBatches),
        dirty: false,
        errors: {},
      }
    case "close":
      // End the edit session: clear the pending-edit markers so a reopened
      // dialog starts clean (Save disabled, no stale validation errors, no
      // orphaned staged file).
      //
      // `formValues` is deliberately kept so the reopened dialog paints
      // immediately; dropping only `hydratedFor` lets the next open refresh
      // in the background without an intermediate spinner. `imagePreview`
      // rolls back to `persistedPreview` rather than being kept as-is:
      // keeping a staged `blob:` would display an upload that a submit would
      // no longer send, and keeping a cleared `null` would hide an image the
      // server still has.
      return {
        ...state,
        hydratedFor: null,
        imagePreview: state.persistedPreview,
        dirty: false,
        errors: {},
        imageCleared: false,
        selectedFile: null,
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
 * - Seeds the form synchronously from the inventory `product` row it was
 *   opened from, so the dialog paints without a loading state.
 * - Fetches `getEditDetail` when `open` is true, as the authoritative refresh
 *   (owner auth re-check, legacy `batchCount` fallback, freshness).
 * - Keeps the last hydrated `formValues` across close/reopen; `hydratedFor`
 *   tracks staleness and drives that background refresh.
 * - Exposes `formValues`, `imagePreview`, `handleChange`, `handleImageSelect`,
 *   `handleSubmit` (validates → uploads image to Convex storage with `ok` +
 *   `storageId` checks → `update.submit`).
 */
export function useEditProductForm({
  product,
  open: openProp,
  onOpenChange,
}: {
  product: EditableProductFields & { _id: Id<"products"> }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { isAuthenticated } = useCurrentUser()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const productId = product._id
  const detail = useQuery(
    api.products.queries.getEditDetail,
    isAuthenticated && open ? { productId } : "skip"
  )
  const update = useUpdateProduct()
  const generateUploadUrl = useMutation(api.batches.mutations.generateUploadUrl)
  const [dialogState, dispatch] = useReducer(
    dialogReducer,
    product,
    initialDialogState
  )
  const {
    formValues,
    hydratedFor,
    imagePreview,
    imageCleared,
    selectedFile,
    imageError,
    lockedFields,
    hasBatches,
    dirty,
    errors,
  } = dialogState

  // Cleanup: revoke the active blob preview when the hook unmounts or when
  // `imagePreview` changes (covers the "cancel without clear" case).
  useEffect(() => {
    return () => {
      if (dialogState.imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(dialogState.imagePreview)
      }
    }
  }, [dialogState.imagePreview])

  // Hydrate from `getEditDetail` once per product per open session.
  //
  // Three guards matter here:
  // - `hydratedFor === productId` makes this idempotent, so a reactive
  //   `detail` change (another user, or a `batchCount` denormalization write)
  //   no longer re-dispatches `open` and wipes in-progress edits.
  // - `dirty` covers the race where the user starts typing while `detail` is
  //   still in flight on reopen — their input wins over the refetch.
  // - `!detail` skips the in-flight state (`undefined`) *and* the confirmed
  //   missing state (`null`); there is nothing to hydrate in either case.
  useEffect(() => {
    if (!open) return
    if (!detail || dirty || hydratedFor === productId) return
    dispatch({
      type: "open",
      productId,
      formValues: buildFormValues(detail),
      imagePreview: detail.imageUrl ?? null,
      hasBatches: (detail.batchCount ?? 0) > 0,
    })
  }, [open, detail, dirty, hydratedFor, productId])

  // Mark the snapshot stale on close without tearing it down, so reopening
  // renders the last known values immediately and refreshes underneath.
  useEffect(() => {
    if (!open && hydratedFor !== null) {
      dispatch({ type: "close" })
    }
  }, [open, hydratedFor])

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
      // Revoked here and again in the reducer's `selectImage`. Revoking twice is
      // harmless (`revokeObjectURL` is idempotent) and keeps this function safe
      // on its own — the hook is the only place that knows a preview is a blob.
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
