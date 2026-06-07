"use client"

import type { Style } from "@react-pdf/types"
import { createContext, useContext } from "react"

export interface PdfPrimitives {
  Page: React.ComponentType<Record<string, unknown>>
  Text: React.ComponentType<Record<string, unknown>>
  View: React.ComponentType<Record<string, unknown>>
  StyleSheet: {
    create: <T extends Record<string, Style>>(styles: T) => T
  }
  Document: React.ComponentType<Record<string, unknown>>
}

export const PdfPrimitivesContext = createContext<PdfPrimitives | null>(null)

let cachedPrimitives: PdfPrimitives | null = null

export function setCachedPrimitives(p: PdfPrimitives | null) {
  cachedPrimitives = p
}

export function usePdfPrimitives(): PdfPrimitives {
  const ctx = useContext(PdfPrimitivesContext)
  if (ctx) return ctx
  if (cachedPrimitives) return cachedPrimitives
  throw new Error(
    "usePdfPrimitives must be used within a PdfPrimitivesProvider"
  )
}
