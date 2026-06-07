"use client"

import type { ReactNode } from "react"
import { type PdfPrimitives, PdfPrimitivesContext } from "./pdf-primitives"

export function PdfPrimitivesProvider({
  primitives,
  children,
}: {
  primitives: PdfPrimitives
  children?: ReactNode
}) {
  return (
    <PdfPrimitivesContext.Provider value={primitives}>
      {children}
    </PdfPrimitivesContext.Provider>
  )
}
