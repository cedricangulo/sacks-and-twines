"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

export type ImageUploadState = {
  file: File | null
  preview: string | null
  storageId: string | null
  error: string | null
}

export function useImageUpload() {
  const generateUploadUrl = useMutation(api.batches.mutations.generateUploadUrl)

  const [state, setState] = useState<ImageUploadState>({
    file: null,
    preview: null,
    storageId: null,
    error: null,
  })

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
    setState({ file, preview, storageId: null, error: null })
  }

  const removeFile = () => {
    setState((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null, storageId: null, error: null }
    })
  }

  const upload = async () => {
    if (!state.file) return null

    const postUrl = await generateUploadUrl()
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": state.file.type },
      body: state.file,
    })
    const { storageId } = await result.json()

    setState((prev) => ({ ...prev, storageId }))
    return storageId as string
  }

  const reset = () => {
    setState((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null, storageId: null, error: null }
    })
  }

  return { state, selectFile, removeFile, upload, reset }
}
