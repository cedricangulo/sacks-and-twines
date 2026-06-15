"use client"

import { createPortal } from "react-dom"

export function DialogBackdrop() {
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm" />,
    document.body
  )
}
