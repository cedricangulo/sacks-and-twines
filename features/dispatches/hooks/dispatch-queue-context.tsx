"use client"

import { createContext, type ReactNode, use } from "react"
import type { DispatchReadyProduct } from "@/features/products/validation"
import { type QueueItem, useDispatchQueue } from "./use-dispatch-queue"

interface DispatchQueueContextValue {
  items: QueueItem[]
  itemCount: number
  incrementQuantity: (product: DispatchReadyProduct) => void
  decrementQuantity: (productId: string) => void
  setQuantity: (product: DispatchReadyProduct, quantity: number) => void
  setDispatchUom: (productId: string, uom: "roll" | "kilo") => void
  removeFromQueue: (productId: string) => void
  clearQueue: () => void
  isInQueue: (productId: string) => boolean
}

const DispatchQueueContext = createContext<DispatchQueueContextValue | null>(
  null
)

export function DispatchQueueProvider({ children }: { children: ReactNode }) {
  const queue = useDispatchQueue()

  return (
    <DispatchQueueContext.Provider value={queue}>
      {children}
    </DispatchQueueContext.Provider>
  )
}

export function useDispatchQueueContext() {
  const ctx = use(DispatchQueueContext)
  if (!ctx) {
    throw new Error(
      "useDispatchQueueContext must be used within DispatchQueueProvider"
    )
  }
  return ctx
}
