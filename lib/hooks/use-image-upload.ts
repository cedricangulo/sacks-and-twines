"use client"

import { useMutation } from "convex/react"
import { useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"

/** Max image size (5 MB) — matches server validation. */
const MAX_FILE_SIZE = 5 * 1024 * 1024
/** MIME types accepted by the upload dropzone. */
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

export type ImageUploadState = {
  /** File selected by the user (not yet uploaded). */
  file: File | null
  /** Blob URL for preview (`URL.createObjectURL`). Null until `selectFile` succeeds. */
  preview: string | null
  /** Convex storage ID returned after `upload()` succeeds. */
  storageId: string | null
  /** Last validation or upload error message. */
  error: string | null
}

/**
 * Generic image picker + preview + upload hook.
 * Used by inventory/product dialogs that need a preview before persisting.
 *
 * Lifecycle: `selectFile(file)` → validates → creates `preview` blob URL →
 * `upload()` → POSTs to Convex `generateUploadUrl` → stores `storageId`.
 * Call `removeFile()` / `reset()` to revoke the blob URL and clear state.
 */
export function useImageUpload() {
  const generateUploadUrl = useMutation(api.batches.mutations.generateUploadUrl)

  const [state, setState] = useState<ImageUploadState>({
    file: null,
    preview: null,
    storageId: null,
    error: null,
  })

  /**
   * Validate and stage a file for preview.
   * - `null` → clears current selection (delegates to `removeFile`).
   * - Wrong type/size → sets `error`, keeps previous preview.
   * - Success → revokes previous `blob:` preview (if any) then creates a new
   *   `URL.createObjectURL` and stores it in `state.preview`.
   */
  const selectFile = (file: File | null) => {
    if (!file) {
      removeFile()
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setState((prev) => ({
        ...prev,
        error: "Only JPEG and PNG files are allowed.",
      }))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setState((prev) => ({
        ...prev,
        error: "File size must be under 5MB.",
      }))
      return
    }

    const preview = URL.createObjectURL(file)
    setState((prev) => {
      // Prevent leak when user re-selects files quickly.
      if (prev.preview?.startsWith("blob:")) URL.revokeObjectURL(prev.preview)
      return { file, preview, storageId: null, error: null }
    })
  }

  /** Clear the staged file and revoke its blob preview. */
  const removeFile = () => {
    setState((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null, storageId: null, error: null }
    })
  }

  /**
   * Upload the staged `state.file` to Convex storage.
   * @returns `storageId` on success, `null` if no file staged.
   * @throws Re-throws network/validation errors after writing `state.error`
   * so callers can show a toast. Validates `res.ok` and that
   * `body.storageId` is a non-empty string before trusting it.
   */
  const upload = async () => {
    if (!state.file) return null

    try {
      const postUrl = await generateUploadUrl()
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": state.file.type },
        body: state.file,
      })
      if (!result.ok) {
        throw new Error(`Upload failed: ${result.status}`)
      }
      const body = (await result.json()) as { storageId?: unknown }
      if (typeof body.storageId !== "string" || body.storageId.length === 0) {
        throw new Error("Missing storageId in upload response")
      }
      setState((prev) => ({ ...prev, storageId: body.storageId as string }))
      return body.storageId
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image."
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }

  /** Reset to empty state and revoke any active preview URL. */
  const reset = () => {
    setState((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null, storageId: null, error: null }
    })
  }

  // Revoke preview on unmount — covers the case where dialog is closed
  // without calling `removeFile`/`reset`.
  useEffect(() => {
    return () => {
      if (state.preview?.startsWith("blob:")) URL.revokeObjectURL(state.preview)
    }
  }, [state.preview])

  return { state, selectFile, removeFile, upload, reset }
}
