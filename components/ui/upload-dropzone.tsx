"use client"

import { ImageUp, X } from "lucide-react"
import Image from "next/image"
import { type DragEvent, type KeyboardEvent, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type UploadDropzoneProps = {
  preview: string | null
  error: string | null
  onSelect: (file: File | null) => void
  accept?: string
  className?: string
}

export default function UploadDropzone({
  preview,
  error,
  onSelect,
  accept = "image/jpeg,image/png",
  className
}: UploadDropzoneProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleFile = (file: File | null) => {
    if (file) onSelect(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file ?? null)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = () => {
    setIsDragActive(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  if (preview) {
    return (
      <div className="relative w-full overflow-hidden border rounded-xl size-40">
        <Image
          src={preview}
          alt="Upload preview"
          fill
          sizes="160px"
          className="object-cover object-center"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon-xs"
          className="absolute top-2 right-2"
          onClick={() => onSelect(null)}
        >
          <X />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center size-40 border border-dashed rounded-xl transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-input hover:bg-accent hover:border-muted-foreground",
          className
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
      >
        <ImageUp className="mb-2 size-6 text-muted-foreground" />
        <p className="px-2 text-xs text-center text-muted-foreground">
          Click to browse
        </p>
        <p className="px-2 text-[10px] text-center text-muted-foreground">
          Max 5MB, JPEG/PNG
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        id={id}
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
